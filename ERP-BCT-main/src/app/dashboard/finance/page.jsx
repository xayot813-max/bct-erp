"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { createERPTransaction, getContracts, getERPTransactions } from "@/lib/actions"
import { currencyReferenceOptions } from "@/lib/reference-data"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { formatMoney, normalizeCurrencyCode, resolveLocale } from "@/lib/utils/currency"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const transactionModes = ["income", "expense"]
const paymentMethodOptions = ["cash", "card", "transfer", "multi"]
const sectionOptions = ["transactions", "accounts", "categories"]

const toDatetimeLocalValue = (value) => {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ""

  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60000)
  return localDate.toISOString().slice(0, 16)
}

const createInitialForm = () => ({
  mode: "income",
  amount: "",
  currency: "UZS",
  paymentMethod: "cash",
  category: "",
  counterparty: "",
  operationAt: toDatetimeLocalValue(new Date()),
  reason: "",
  comment: "",
  breakdownCash: "",
  breakdownCard: "",
  breakdownTransfer: "",
})

const paymentMethodLabel = (t, value) => {
  switch (value) {
    case "cash":
      return t("finance.transaction.paymentMethods.cash", { defaultValue: "Наличные" })
    case "card":
      return t("finance.transaction.paymentMethods.card", { defaultValue: "Карта" })
    case "transfer":
      return t("finance.transaction.paymentMethods.transfer", { defaultValue: "Перевод" })
    case "multi":
      return t("finance.transaction.paymentMethods.multi", { defaultValue: "Мультиоплата" })
    default:
      return value || "—"
  }
}

const paymentState = (contract) => {
  const override = contract?.payment_status_override || contract?.paymentStatusOverride
  if (override === "paid" || override === "partial" || override === "unpaid") return override

  const total = toNumber(contract?.contract_amount)
  const paid = toNumber(contract?.pay_card) + toNumber(contract?.pay_cash)
  if (total > 0 && paid >= total) return "paid"
  if (paid > 0) return "partial"
  return "unpaid"
}

export default function FinancePage() {
  const { t, i18n } = useTranslation("common")
  const [contracts, setContracts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [activeSection, setActiveSection] = useState("transactions")
  const [selectedAccountsCurrency, setSelectedAccountsCurrency] = useState("UZS")
  const [form, setForm] = useState(createInitialForm)

  const locale = useMemo(() => resolveLocale(i18n.resolvedLanguage || i18n.language), [i18n.language, i18n.resolvedLanguage])

  const pageHeading = showCreateForm
    ? t("finance.transaction.pageTitle", { defaultValue: "Транзакция" })
    : activeSection === "accounts"
      ? t("finance.sections.accounts", { defaultValue: "Счета" })
      : activeSection === "categories"
        ? t("finance.sections.categories", { defaultValue: "Категории" })
        : t("finance.title", { defaultValue: "Финансы" })

  const pageSubtitle = showCreateForm
    ? t("finance.transaction.pageSubtitle", {
        defaultValue: "Создайте и сохраните приход или расход, чтобы операция сразу попала в финансовый учёт.",
      })
    : activeSection === "accounts"
      ? t("finance.accounts.subtitle", { defaultValue: "Баланс по кассе, карте и переводам в одном экране." })
      : activeSection === "categories"
        ? t("finance.categories.subtitle", { defaultValue: "Сводка по типам финансовых операций." })
        : t("finance.subtitle", { defaultValue: "Реальные суммы рассчитаны по сохранённым сделкам и оплатам." })

  useEffect(() => {
    let cancelled = false

    const loadFinance = async () => {
      setIsLoading(true)
      setError("")
      try {
        const [contractsResponse, transactionsResponse] = await Promise.all([
          getContracts({ limit: 1000 }),
          getERPTransactions({ limit: 1000, kind: "finance" }),
        ])

        if (!cancelled) {
          setContracts(extractArrayFromResponse(contractsResponse, ["contracts"]))
          setTransactions(extractArrayFromResponse(transactionsResponse, ["transactions"]))
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.message || t("finance.loadError", { defaultValue: "Не удалось загрузить финансы" }))
        }
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
      const currency = normalizeCurrencyCode(contract?.contract_currency || contract?.currency)
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

  const transactionStatsByCurrency = useMemo(() => {
    const seedByCurrency = new Map()

    const ensureCurrencyStats = (currency) => {
      const normalizedCurrency = normalizeCurrencyCode(currency)
      if (!seedByCurrency.has(normalizedCurrency)) {
        seedByCurrency.set(normalizedCurrency, {
          currency: normalizedCurrency,
          incomeTotal: 0,
          expenseTotal: 0,
          totalOperations: 0,
          debtTotal: 0,
          accountCards: [
            { key: "cash", balance: 0, count: 0, currency: normalizedCurrency },
            { key: "card", balance: 0, count: 0, currency: normalizedCurrency },
            { key: "transfer", balance: 0, count: 0, currency: normalizedCurrency },
          ],
        })
      }
      return seedByCurrency.get(normalizedCurrency)
    }

    transactions.forEach((transaction) => {
      const currency = normalizeCurrencyCode(transaction?.currency)
      const current = ensureCurrencyStats(currency)
      const amount = toNumber(transaction?.amount)
      const mode = transaction?.type === "expense" ? -1 : 1
      const paymentMethod = transaction?.payment_method || transaction?.paymentMethod
      const metadata = transaction?.metadata || {}
      const breakdown = metadata?.payment_breakdown || metadata?.paymentBreakdown || {}

      current.totalOperations += 1
      if (mode > 0) current.incomeTotal += amount
      else current.expenseTotal += amount

      const assignToMethod = (methodKey, methodAmount) => {
        const account = current.accountCards.find((item) => item.key === methodKey)
        if (!account) return
        account.balance += mode * toNumber(methodAmount)
        account.count += 1
      }

      if (paymentMethod === "multi") {
        assignToMethod("cash", breakdown?.cash)
        assignToMethod("card", breakdown?.card)
        assignToMethod("transfer", breakdown?.transfer)
        return
      }

      assignToMethod(paymentMethod, amount)
    })

    contracts.forEach((contract) => {
      const currency = normalizeCurrencyCode(contract?.contract_currency || contract?.currency)
      const current = ensureCurrencyStats(currency)
      const total = toNumber(contract?.contract_amount)
      const paid = toNumber(contract?.pay_card) + toNumber(contract?.pay_cash)
      current.debtTotal += Math.max(0, total - paid)
    })

    return seedByCurrency
  }, [contracts, transactions])

  const transactionStats = useMemo(() => {
    const current = transactionStatsByCurrency.get(selectedAccountsCurrency)
    if (current) {
      return {
        ...current,
        netRevenue: current.incomeTotal - current.expenseTotal,
        activeAccounts: current.accountCards.filter((item) => item.count > 0 || item.balance !== 0).length,
      }
    }

    return {
      currency: selectedAccountsCurrency,
      incomeTotal: 0,
      expenseTotal: 0,
      netRevenue: 0,
      activeAccounts: 0,
      totalOperations: 0,
      debtTotal: 0,
      accountCards: [
        { key: "cash", balance: 0, count: 0, currency: selectedAccountsCurrency },
        { key: "card", balance: 0, count: 0, currency: selectedAccountsCurrency },
        { key: "transfer", balance: 0, count: 0, currency: selectedAccountsCurrency },
      ],
    }
  }, [selectedAccountsCurrency, transactionStatsByCurrency])

  const categoryRows = useMemo(() => {
    const grouped = new Map()

    transactions.forEach((transaction) => {
      const category = String(transaction?.category || "").trim() || t("finance.categories.uncategorized", { defaultValue: "Без категории" })
      const current = grouped.get(category) || { name: category, income: 0, expense: 0, count: 0, currency: normalizeCurrencyCode(transaction?.currency) }
      const amount = toNumber(transaction?.amount)
      if (transaction?.type === "expense") current.expense += amount
      else current.income += amount
      current.count += 1
      grouped.set(category, current)
    })

    return Array.from(grouped.values()).sort((a, b) => (b.income - b.expense) - (a.income - a.expense))
  }, [t, transactions])

  const submitTransaction = async () => {
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toastWarning({ title: t("finance.transaction.validation.amount", { defaultValue: "Укажите корректную сумму" }) })
      return
    }
    if (!form.category.trim()) {
      toastWarning({ title: t("finance.transaction.validation.category", { defaultValue: "Укажите тип операции" }) })
      return
    }
    if (!form.counterparty.trim()) {
      toastWarning({ title: t("finance.transaction.validation.counterparty", { defaultValue: "Укажите от кого или кому проводится операция" }) })
      return
    }
    if (!form.reason.trim()) {
      toastWarning({ title: t("finance.transaction.validation.reason", { defaultValue: "Укажите основание операции" }) })
      return
    }

    const breakdown = {
      cash: Number(form.breakdownCash || 0),
      card: Number(form.breakdownCard || 0),
      transfer: Number(form.breakdownTransfer || 0),
    }
    const breakdownTotal = breakdown.cash + breakdown.card + breakdown.transfer
    if (form.paymentMethod === "multi" && breakdownTotal !== amount) {
      toastWarning({
        title: t("finance.transaction.validation.breakdown", {
          defaultValue: "Сумма мультиоплаты должна совпадать с общей суммой транзакции",
        }),
      })
      return
    }

    const paymentLabel = paymentMethodLabel(t, form.paymentMethod)
    const source = form.mode === "income" ? form.counterparty.trim() : paymentLabel
    const destination = form.mode === "income" ? paymentLabel : form.counterparty.trim()

    setIsSaving(true)
    try {
      await createERPTransaction({
        kind: "finance",
        type: form.mode,
        category: form.category.trim(),
        status: "posted",
        amount,
        currency: form.currency,
        source,
        destination,
        payment_method: form.paymentMethod,
        operation_at: new Date(form.operationAt).toISOString(),
        reason: form.reason.trim(),
        comment: form.comment.trim(),
        metadata: {
          mode: form.mode,
          counterparty: form.counterparty.trim(),
          payment_method: form.paymentMethod,
          payment_breakdown: form.paymentMethod === "multi" ? breakdown : undefined,
        },
      })

      const transactionsResponse = await getERPTransactions({ limit: 1000, kind: "finance" })
      setTransactions(extractArrayFromResponse(transactionsResponse, ["transactions"]))
      setForm(createInitialForm())
      setShowCreateForm(false)
      setActiveSection("transactions")
      toastSuccess({ title: t("finance.transaction.saved", { defaultValue: "Транзакция сохранена" }) })
    } catch (saveError) {
      toastError({
        title: t("finance.transaction.saveError", { defaultValue: "Не удалось сохранить транзакцию" }),
        description: saveError?.message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const renderMainContent = () => {
    if (activeSection === "accounts") {
      return (
        <div className="space-y-6">
          <div className="rounded-[18px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[var(--primary)] text-[26px] font-semibold text-[var(--primary-foreground)]">
                {selectedAccountsCurrency}
              </div>
              <div>
                <div className="text-[12px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">{t("finance.accounts.centerLabel", { defaultValue: "Финансовый центр" })}</div>
                <div className="text-[34px] font-semibold text-[var(--text-primary)]">{t("finance.sections.accounts", { defaultValue: "Счета" })}</div>
              </div>
              <div className="ml-auto w-full max-w-[140px]">
                <label className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {t("finance.transaction.fields.currency", { defaultValue: "Валюта" })}
                </label>
                <select
                  value={selectedAccountsCurrency}
                  onChange={(event) => setSelectedAccountsCurrency(event.target.value)}
                  className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]"
                >
                  {currencyReferenceOptions.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label={t("finance.accounts.netRevenue", { defaultValue: "Чистая выручка" })} value={formatMoney(transactionStats.netRevenue, selectedAccountsCurrency, locale)} />
              <MetricCard label={t("finance.accounts.manualBalance", { defaultValue: "Ручной баланс" })} value={formatMoney(0, selectedAccountsCurrency, locale)} />
              <MetricCard label={t("finance.accounts.operations", { defaultValue: "Операций" })} value={String(transactionStats.totalOperations)} />
              <MetricCard label={t("finance.accounts.debts", { defaultValue: "Долги" })} value={formatMoney(transactionStats.debtTotal, selectedAccountsCurrency, locale)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label={t("finance.accounts.activeAccounts", { defaultValue: "Активных счетов" })} value={String(transactionStats.activeAccounts)} />
            <MetricCard label={t("finance.accounts.balance", { defaultValue: "Баланс" })} value={formatMoney(transactionStats.netRevenue, selectedAccountsCurrency, locale)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {transactionStats.accountCards.map((account) => (
              <div key={account.key} className="rounded-[18px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-[var(--surface-elevated)] text-[28px] font-semibold text-[var(--text-primary)]">
                      {paymentMethodLabel(t, account.key).slice(0, 1)}
                    </div>
                    <div>
                      <div className="text-[24px] font-semibold text-[var(--text-primary)]">{paymentMethodLabel(t, account.key)}</div>
                      <div className="text-[13px] text-[var(--text-secondary)]">
                        {t("finance.accounts.typeLabel", { defaultValue: "Тип счёта" })}: {paymentMethodLabel(t, account.key)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-[22px] font-semibold text-[var(--text-primary)]">
                    {formatMoney(account.balance, account.currency || "UZS", locale)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (activeSection === "categories") {
      return (
        <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4 text-[18px] font-semibold text-[var(--text-primary)]">
            {t("finance.categories.title", { defaultValue: "Категории операций" })}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px] text-[var(--text-primary)]">
              <thead className="bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 text-left font-normal">{t("finance.categories.columns.name", { defaultValue: "Категория" })}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("finance.categories.columns.income", { defaultValue: "Приход" })}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("finance.categories.columns.expense", { defaultValue: "Расход" })}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("finance.categories.columns.balance", { defaultValue: "Баланс" })}</th>
                  <th className="px-5 py-4 text-left font-normal">{t("finance.categories.columns.operations", { defaultValue: "Операций" })}</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.length > 0 ? categoryRows.map((row) => (
                  <tr key={row.name} className="border-t border-[var(--border-subtle)]">
                    <td className="px-5 py-4">{row.name}</td>
                    <td className="px-5 py-4">{formatMoney(row.income, row.currency || "UZS", locale)}</td>
                    <td className="px-5 py-4">{formatMoney(row.expense, row.currency || "UZS", locale)}</td>
                    <td className="px-5 py-4">{formatMoney(row.income - row.expense, row.currency || "UZS", locale)}</td>
                    <td className="px-5 py-4">{row.count}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-[var(--text-secondary)]">
                      {t("finance.categories.empty", { defaultValue: "Категории появятся после первых транзакций." })}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    return (
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
                  const currency = normalizeCurrencyCode(contract?.contract_currency || contract?.currency)
                  const status = paymentState(contract)
                  return (
                    <tr key={contract?.id || contract?._id} className="border-t border-[var(--border-subtle)]">
                      <td className="px-5 py-4">{contract?.contract_number || "—"}</td>
                      <td className="px-5 py-4">{contract?.client_name || "—"}</td>
                      <td className="px-5 py-4">{formatMoney(total, currency, locale)}</td>
                      <td className="px-5 py-4">{formatMoney(paid, currency, locale)}</td>
                      <td className="px-5 py-4">{formatMoney(remaining, currency, locale)}</td>
                      <td className="px-5 py-4">{t(`finance.status.${status}`, { defaultValue: status })}</td>
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
    )
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1440px] pt-10 pb-5">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 xl:flex-nowrap">
        <div>
          <h1 className="text-[52px] font-normal leading-none tracking-[-0.03em] text-[var(--text-primary)]">
            {pageHeading}
          </h1>
          <p className="mt-3 text-[13px] text-[var(--text-secondary)]">
            {pageSubtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          {!showCreateForm && sectionOptions.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setActiveSection(section)}
              className={activeSection === section
                ? "inline-flex h-10 items-center rounded-[999px] border border-[var(--primary)] bg-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary-foreground)]"
                : "inline-flex h-10 items-center rounded-[999px] border border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)]"}
            >
              {t(`finance.sections.${section}`, { defaultValue: section })}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((current) => !current)
              if (!showCreateForm) setActiveSection("transactions")
            }}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-4 w-4" />
            {showCreateForm
              ? t("finance.transaction.backToFinance", { defaultValue: "Вернуться к финансам" })
              : t("finance.transaction.add", { defaultValue: "Добавить транзакцию" })}
          </button>
          <Link
            href="/dashboard/deals/add"
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--primary)] bg-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)]"
          >
            {t("finance.createDeal")}
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)]">
          {t("common.loading", { defaultValue: "Загрузка..." })}
        </div>
      ) : error ? (
        <div className="rounded-[14px] border border-[var(--danger)] bg-[var(--surface)] p-10 text-center text-[var(--danger)]">{error}</div>
      ) : (
        <div className="space-y-6">
          {showCreateForm ? (
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 xl:flex-nowrap">
                <div>
                  <div className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">
                    {t("finance.transaction.formPageTitle", { defaultValue: "Новая транзакция" })}
                  </div>
                  <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                    {form.mode === "income"
                      ? t("finance.transaction.formTitleIncome", { defaultValue: "Оформление прихода денежных средств" })
                      : t("finance.transaction.formTitleExpense", { defaultValue: "Оформление расхода денежных средств" })}
                  </p>
                </div>
                <div className="inline-flex shrink-0 rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1">
                  {transactionModes.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForm((current) => ({ ...current, mode }))}
                      className={form.mode === mode
                        ? "h-9 rounded-[10px] bg-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary-foreground)]"
                        : "h-9 rounded-[10px] px-4 text-[13px] font-medium text-[var(--text-secondary)]"}
                    >
                      {mode === "income"
                        ? t("finance.transaction.types.income", { defaultValue: "Приход денег" })
                        : t("finance.transaction.types.expense", { defaultValue: "Расход денег" })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.1fr_0.6fr_1fr]">
                <Field label={t("finance.transaction.fields.amount", { defaultValue: "Сумма" })}>
                  <input value={form.amount} placeholder={t("finance.transaction.placeholders.amount", { defaultValue: "Например: 125000" })} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]" />
                </Field>
                <Field label={t("finance.transaction.fields.currency", { defaultValue: "Валюта" })}>
                  <select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]">
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </Field>
                <Field label={t("finance.transaction.fields.category", { defaultValue: "Тип операции" })}>
                  <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder={t("finance.transaction.placeholders.category", { defaultValue: "Например: Продажа, Возврат, Закупка" })} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                </Field>
              </div>

              <div className="mt-4">
                <Field label={t("finance.transaction.fields.account", { defaultValue: "Счёт" })}>
                  <div className="flex flex-wrap gap-2">
                    {paymentMethodOptions.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setForm((current) => ({ ...current, paymentMethod: method }))}
                        className={form.paymentMethod === method
                          ? "h-10 rounded-[999px] border border-[var(--primary)] bg-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary-foreground)]"
                          : "h-10 rounded-[999px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[13px] font-medium text-[var(--text-primary)]"}
                      >
                        {paymentMethodLabel(t, method)}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              {form.paymentMethod === "multi" ? (
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label={t("finance.transaction.fields.breakdownCash", { defaultValue: "Наличные" })}>
                    <input value={form.breakdownCash} onChange={(event) => setForm((current) => ({ ...current, breakdownCash: event.target.value }))} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]" />
                  </Field>
                  <Field label={t("finance.transaction.fields.breakdownCard", { defaultValue: "Карта" })}>
                    <input value={form.breakdownCard} onChange={(event) => setForm((current) => ({ ...current, breakdownCard: event.target.value }))} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]" />
                  </Field>
                  <Field label={t("finance.transaction.fields.breakdownTransfer", { defaultValue: "Перевод" })}>
                    <input value={form.breakdownTransfer} onChange={(event) => setForm((current) => ({ ...current, breakdownTransfer: event.target.value }))} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]" />
                  </Field>
                </div>
              ) : null}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Field label={form.mode === "income"
                  ? t("finance.transaction.fields.counterpartyIncome", { defaultValue: "От кого" })
                  : t("finance.transaction.fields.counterpartyExpense", { defaultValue: "Кому" })}>
                  <input value={form.counterparty} onChange={(event) => setForm((current) => ({ ...current, counterparty: event.target.value }))} placeholder={form.mode === "income"
                    ? t("finance.transaction.placeholders.counterpartyIncome", { defaultValue: "Клиент, кассир, компания" })
                    : t("finance.transaction.placeholders.counterpartyExpense", { defaultValue: "Поставщик, сотрудник, сервис" })} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                </Field>
                <Field label={t("finance.transaction.fields.operationAt", { defaultValue: "Дата операции" })}>
                  <input type="datetime-local" value={form.operationAt} onChange={(event) => setForm((current) => ({ ...current, operationAt: event.target.value }))} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)]" />
                </Field>
              </div>

              <div className="mt-4">
                <Field label={t("finance.transaction.fields.reason", { defaultValue: "Основание" })}>
                  <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder={t("finance.transaction.placeholders.reason", { defaultValue: "Номер документа или причина" })} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                </Field>
              </div>

              <div className="mt-4">
                <Field label={t("finance.transaction.fields.comment", { defaultValue: "Комментарий" })}>
                  <textarea value={form.comment} onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))} rows={4} placeholder={t("finance.transaction.placeholders.comment", { defaultValue: "Описание операции" })} className="w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-3 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                </Field>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateForm(false)} className="h-10 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] text-[var(--text-primary)]">
                  {t("common.cancel", { defaultValue: "Отмена" })}
                </button>
                <button type="button" onClick={submitTransaction} disabled={isSaving} className="h-10 rounded-[10px] bg-[var(--primary)] px-4 text-[13px] font-medium text-[var(--primary-foreground)] disabled:opacity-60">
                  {isSaving ? t("common.saving", { defaultValue: "Сохранение..." }) : t("finance.transaction.submit", { defaultValue: "Сохранить транзакцию" })}
                </button>
              </div>
            </div>
          ) : null}

          {!showCreateForm && renderMainContent()}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  )
}

function MoneyLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[13px]">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

function StatusCard({ label, value }) {
  return (
    <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
      <div className="text-[13px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-3 text-[40px] font-semibold leading-none text-[var(--text-primary)]">{value}</div>
    </div>
  )
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-[16px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 py-4">
      <div className="text-[13px] text-[var(--text-secondary)]">{label}</div>
      <div className="mt-2 text-[28px] font-semibold leading-tight text-[var(--text-primary)]">{value}</div>
    </div>
  )
}
