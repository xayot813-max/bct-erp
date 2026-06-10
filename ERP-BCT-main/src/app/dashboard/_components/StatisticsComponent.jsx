"use client"

import * as React from "react"
import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getClients, getContracts, getProducts } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"

const toValidDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const dateKey = (date) => date.toISOString().slice(0, 10)

const incrementDay = (map, date, field, amount = 1) => {
  if (!date) return
  const key = dateKey(date)
  const current = map.get(key) || { date: key, client: 0, products: 0, deals: 0 }
  current[field] += amount
  map.set(key, current)
}

const buildMonthSeries = (items, selectedMonth) => {
  if (!selectedMonth) return items
  const [year, month] = selectedMonth.split("-").map(Number)
  if (!year || !month) return items

  const byDate = new Map(items.map((item) => [item.date, item]))
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0")
    const key = `${selectedMonth}-${day}`
    return byDate.get(key) || { date: key, client: 0, products: 0, deals: 0 }
  })
}

export function ChartAreaInteractive() {
  const { t, i18n } = useTranslation("common")
  const [chartData, setChartData] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [selectedMonth, setSelectedMonth] = React.useState("")

  const locale = React.useMemo(() => {
    const language = (i18n.resolvedLanguage || i18n.language || "en").toLowerCase()
    if (language.startsWith("ru")) return "ru-RU"
    if (language.startsWith("uz")) return "uz-UZ"
    return "en-US"
  }, [i18n.language, i18n.resolvedLanguage])

  React.useEffect(() => {
    let cancelled = false

    const loadAnalytics = async () => {
      setIsLoading(true)
      setLoadError("")
      try {
        const [clientsResponse, productsResponse, contractsResponse] = await Promise.all([
          getClients({ limit: 1000 }),
          getProducts({ limit: 1000 }),
          getContracts({ limit: 1000 }),
        ])
        if (cancelled) return

        const buckets = new Map()
        extractArrayFromResponse(clientsResponse, ["clients"]).forEach((item) => {
          incrementDay(buckets, toValidDate(item?.created_at || item?.createdAt), "client")
        })
        extractArrayFromResponse(productsResponse, ["products"]).forEach((item) => {
          incrementDay(buckets, toValidDate(item?.created_at || item?.createdAt), "products")
        })
        extractArrayFromResponse(contractsResponse, ["contracts"]).forEach((item) => {
          incrementDay(buckets, toValidDate(item?.deal_date || item?.created_at || item?.createdAt), "deals")
        })

        const nextData = Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date))
        setChartData(nextData)
        setSelectedMonth((current) => current || nextData.at(-1)?.date.slice(0, 7) || "")
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.message || t("analytics.loadError", { defaultValue: "Не удалось загрузить аналитику" }))
          setChartData([])
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadAnalytics()
    return () => {
      cancelled = true
    }
  }, [t])

  const chartConfig = React.useMemo(() => ({
    client: {
      label: t("analytics.clients", { defaultValue: "Clients" }),
      color: "var(--chart-1)",
    },
    products: {
      label: t("analytics.products", { defaultValue: "Products" }),
      color: "var(--chart-2)",
    },
  }), [t])

  const monthOptions = React.useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" })
    const seen = new Map()
    chartData.forEach((item) => {
      const date = new Date(item.date)
      const key = item.date.slice(0, 7)
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          label: monthFormatter.format(date).replace(/^./, (char) => char.toUpperCase()),
        })
      }
    })
    return Array.from(seen.values())
  }, [chartData, locale])

  const filteredData = React.useMemo(() => {
    if (!selectedMonth) return chartData
    return buildMonthSeries(
      chartData.filter((item) => item.date.startsWith(selectedMonth)),
      selectedMonth,
    )
  }, [chartData, selectedMonth])

  const selectedMonthLabel = React.useMemo(() => {
    return monthOptions.find((month) => month.key === selectedMonth)?.label ?? t("analytics.period", { defaultValue: "Period" })
  }, [monthOptions, selectedMonth, t])

  const totals = React.useMemo(() => {
    return filteredData.reduce(
      (acc, item) => ({
        client: acc.client + item.client,
        products: acc.products + item.products,
        deals: acc.deals + item.deals,
      }),
      { client: 0, products: 0, deals: 0 },
    )
  }, [filteredData])

  const averageMetrics = React.useMemo(() => {
    if (filteredData.length === 0) return { client: 0, products: 0 }
    return {
      client: Math.round(totals.client / filteredData.length),
      products: Math.round(totals.products / filteredData.length),
    }
  }, [filteredData, totals])

  const activeDays = React.useMemo(() => {
    return filteredData.filter((item) => item.client > 0 || item.products > 0 || item.deals > 0).length
  }, [filteredData])

  return (
    <section className="mx-auto mt-12 w-[95%] max-w-[1240px] pb-12">
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-[24px] font-normal text-[var(--text-primary)]">{t("analytics.deals", { defaultValue: "Deals" })}</h2>
            <span className="text-[20px] leading-none text-[var(--text-muted)]">〈</span>
          </div>
          <div className="flex items-center gap-3 text-[14px] text-[var(--text-secondary)]">
            <span>{t("analytics.period", { defaultValue: "Period" })}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  disabled={monthOptions.length === 0}
                  className="h-[32px] rounded-[8px] border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[12px] font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-hover)] disabled:opacity-70"
                >
                  {selectedMonthLabel}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[168px]">
                {monthOptions.length > 0 ? (
                  monthOptions.map((month) => (
                    <DropdownMenuItem key={month.key} onClick={() => setSelectedMonth(month.key)}>
                      {month.label}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>
                    {t("analytics.empty", { defaultValue: "Нет реальных данных для аналитики" })}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ChartContainer className="aspect-auto h-[176px] w-full rounded-[16px] border border-[var(--border-default)] bg-[var(--surface)] px-4 py-3 shadow-[var(--surface-warm-shadow)]" data-slot="chart-surface" config={chartConfig}>
          {isLoading || loadError || filteredData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-secondary)]">
              {isLoading ? t("common.loading", { defaultValue: "Загрузка..." }) : loadError || t("analytics.empty", { defaultValue: "Нет реальных данных для аналитики" })}
            </div>
          ) : (
            <AreaChart accessibilityLayer data={filteredData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={9} interval={4} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} tickFormatter={(value) => new Date(value).toLocaleDateString(locale, { day: "numeric" })} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} domain={[0, "dataMax + 1"]} tick={{ fontSize: 12, fill: "var(--text-secondary)" }} width={28} />
              <Tooltip cursor={{ stroke: "var(--border-default)", strokeDasharray: "3 3" }} content={<ChartTooltipContent className="min-w-[104px] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-2.5 py-2 text-[10px] shadow-[var(--surface-shadow)] backdrop-blur-0" />} />
              <Area dataKey="products" type="monotone" fill="transparent" stroke="#AEB8C8" strokeWidth={2} activeDot={{ r: 4 }} />
              <Area dataKey="client" type="monotone" fill="transparent" stroke="var(--text-primary)" strokeWidth={2} activeDot={{ r: 4 }} />
            </AreaChart>
          )}
        </ChartContainer>
      </div>

      <div className="mt-9 grid w-full max-w-[760px] grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-16">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">{t("analytics.clients", { defaultValue: "Clients" })}</h3>
            <Info className="h-3 w-3 text-[var(--text-muted)]" />
          </div>
          <MetricLine label={t("analytics.totalForMonth", { defaultValue: "Total for month" })} value={`${totals.client.toLocaleString()} ${t("analytics.clientsUnit", { defaultValue: "clients" })}`} />
          <MetricLine label={t("analytics.averagePerDay", { defaultValue: "Average per day" })} value={`${averageMetrics.client.toLocaleString()} ${t("analytics.clientsUnit", { defaultValue: "clients" })}`} />
          <MetricLine label={t("analytics.activeDays", { defaultValue: "Активных дней" })} value={activeDays.toLocaleString()} />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-semibold text-[var(--text-primary)]">{t("analytics.products", { defaultValue: "Products" })}</h3>
            <Info className="h-3 w-3 text-[var(--text-muted)]" />
          </div>
          <MetricLine label={t("analytics.totalForMonth", { defaultValue: "Total for month" })} value={`${totals.products.toLocaleString()} ${t("analytics.productsUnit", { defaultValue: "products" })}`} />
          <MetricLine label={t("analytics.averagePerDay", { defaultValue: "Average per day" })} value={`${averageMetrics.products.toLocaleString()} ${t("analytics.productsUnit", { defaultValue: "products" })}`} />
          <MetricLine label={t("analytics.activeDays", { defaultValue: "Активных дней" })} value={activeDays.toLocaleString()} />
        </div>
      </div>
    </section>
  )
}

function MetricLine({ label, value, meta }) {
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-3">
        <div className="h-[2px] w-4 rounded bg-[var(--text-muted)]" />
        <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
      </div>
      <span className="ml-7 text-[12px] font-medium text-[var(--text-primary)]">
        {value}
        {meta ? <span className="ml-2 text-[var(--text-secondary)]">{meta}</span> : null}
      </span>
    </div>
  )
}
