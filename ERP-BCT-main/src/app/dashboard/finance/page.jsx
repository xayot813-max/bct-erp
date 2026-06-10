"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getContracts } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { currencyReferenceOptions } from "@/lib/reference-data"

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const resolveCurrency = (currency) =>
  currencyReferenceOptions.find((item) => item.id === currency) || currencyReferenceOptions[0]

const formatMoney = (value, currency, locale) => {
  const option = resolveCurrency(currency)
  return `${toNumber(value).toLocaleString(locale, { maximumFractionDigits: 2 })} ${option.symbol || option.label}`
}

const paymentState = (contract) => {
  const total = toNumber(contract?.contract_amount)
  const paid = toNumber(contract?.pay_card) + toNumber(contract?.pay_cash)
  if (total > 0 && paid >= total) return "paid"
  if (paid > 0) return "partial"
  return "unpaid"
}

export default function FinancePage() {
  const { t, i18n } = useTranslation("common")
  const [contracts, setContracts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const locale = useMemo(() => {
    const language = (i18n.resolvedLanguage || i18n.language || "ru").toLowerCase()
    if (language.startsWith("en")) return "en-US"
    if (language.startsWith("uz")) return "uz-UZ"
    return "ru-RU"
  }, [i18n.language, i18n.resolvedLanguage])

  useEffect(() => {
    let cancelled = false
    const loadFinance = async () => {
      setIsLoading(true)
      setError("")
      try {
        const response = await getContracts({ limit: 1000 })
        if (!cancelled) setContracts(extractArrayFromResponse(response, ["contracts"]))
      } catch (loadError) {
        if (!cancelled) setError(loadError?.message || t("finance.loadError", { defaultValue: "Не удалось загрузить финансы" }))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadFinance()
    return () => {
      cancelled = true
    }
  }, [t])

  const summaries = useMemo(() => {
    const byCurrency = new Map()
    contracts.forEach((contract) => {
      const currency = contract?.contract_currency || "UZS"
      const current = byCurrency.get(currency) || { currency, total: 0, paid: 0, remaining: 0, contracts: 0 }
      const total = toNumber(contract?.contract_amount)
      const paid = toNumber(contract?.pay_card) + toNumber(contract?.pay_cash)
      current.total += total
      current.paid += paid
      current.remaining += Math.max(0, total - paid)
      current.contracts += 1
      byCurrency.set(currency, current)
    })
    return Array.from(byCurrency.values())
  }, [contracts])

  const statusCounts = useMemo(() => {
    return contracts.reduce(
      (acc, contract) => {
        acc[paymentState(contract)] += 1
        return acc
      },
      { paid: 0, partial: 0, unpaid: 0 },
    )
  }, [contracts])

  const rows = useMemo(() => {
    return [...contracts]
      .sort((a, b) => new Date(b?.updated_at || b?.created_at || 0) - new Date(a?.updated_at || a?.created_at || 0))
      .slice(0, 12)
  }, [contracts])

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {t("finance.title", { defaultValue: "Финансы" })}
          </h1>
          <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
            {t("finance.subtitle", { defaultValue: "Реальные суммы рассчитаны по сохранённым сделкам и оплатам." })}
          </p>
        </div>
        <Link
          href="/dashboard/deals/add"
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--primary)] bg-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)]"
        >
          {t("finance.createDeal")}
        </Link>
      </div>

      {isLoading ? (
        <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)]">
          {t("common.loading", { defaultValue: "Загрузка..." })}
        </div>
      ) : error ? (
        <div className="rounded-[14px] border border-[var(--danger)] bg-[var(--surface)] p-10 text-center text-[var(--danger)]">{error}</div>
      ) : contracts.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)]">
          {t("finance.empty", { defaultValue: "Пока нет реальных финансовых операций. Создайте сделку, чтобы увидеть расчёты." })}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <StatusCard label={t("finance.statusPaid", { defaultValue: "Оплачено" })} value={statusCounts.paid} />
            <StatusCard label={t("finance.statusPartial", { defaultValue: "Оплачено частично" })} value={statusCounts.partial} />
            <StatusCard label={t("finance.statusUnpaid", { defaultValue: "Не оплачено" })} value={statusCounts.unpaid} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {summaries.map((summary) => (
              <div key={summary.currency} className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">{summary.currency}</h2>
                  <span className="text-[12px] text-[var(--text-secondary)]">{summary.contracts} {t("finance.contracts", { defaultValue: "сделок" })}</span>
                </div>
                <MoneyLine label={t("finance.totalAmount", { defaultValue: "Общая сумма" })} value={formatMoney(summary.total, summary.currency, locale)} />
                <MoneyLine label={t("finance.paidAmount", { defaultValue: "Оплачено" })} value={formatMoney(summary.paid, summary.currency, locale)} />
                <MoneyLine label={t("finance.remainingAmount", { defaultValue: "Осталось" })} value={formatMoney(summary.remaining, summary.currency, locale)} />
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4 text-[18px] font-semibold text-[var(--text-primary)]">
              {t("finance.realHistory", { defaultValue: "Реальная история сделок" })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-[13px] text-[var(--text-primary)]">
                <thead className="bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-4 text-left font-normal">{t("dealForm.fields.contractNumber.label")}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("clients.columns.name")}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.totalAmount", { defaultValue: "Общая сумма" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.paidAmount", { defaultValue: "Оплачено" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.remainingAmount", { defaultValue: "Осталось" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.paymentStatus", { defaultValue: "Статус оплаты" })}</th>
                    <th className="px-5 py-4 text-right font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((contract) => {
                    const total = toNumber(contract?.contract_amount)
                    const paid = toNumber(contract?.pay_card) + toNumber(contract?.pay_cash)
                    const remaining = Math.max(0, total - paid)
                    const currency = contract?.contract_currency || "UZS"
                    return (
                      <tr key={contract?.id || contract?._id} className="border-t border-[var(--border-subtle)]">
                        <td className="px-5 py-4">{contract?.contract_number || "—"}</td>
                        <td className="px-5 py-4">{contract?.client_name || "—"}</td>
                        <td className="px-5 py-4">{formatMoney(total, currency, locale)}</td>
                        <td className="px-5 py-4">{formatMoney(paid, currency, locale)}</td>
                        <td className="px-5 py-4">{formatMoney(remaining, currency, locale)}</td>
                        <td className="px-5 py-4">{t(`finance.status.${paymentState(contract)}`, { defaultValue: paymentState(contract) })}</td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/dashboard/deals/add?contractId=${contract?.id || contract?._id}&type=edit`} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-hover)]">
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusCard({ label, value }) {
  return (
    <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
      <div className="text-[12px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-2 text-[28px] font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function MoneyLine({ label, value }) {
  return (
    <div className="flex items-center justify-between border-t border-[var(--border-subtle)] py-3 first:border-t-0">
      <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}
