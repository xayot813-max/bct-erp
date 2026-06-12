"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { createERPTransaction, getContracts, getERPTransactions } from "@/lib/actions"
import { extractArrayFromResponse } from "@/lib/utils/api-helpers"
import { formatMoney, normalizeCurrencyCode, resolveLocale } from "@/lib/utils/currency"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"

const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const paymentState = (contract) => {
  const total = toNumber(contract?.contract_amount)
  const paid = toNumber(contract?.pay_card) + toNumber(contract?.pay_cash)
  if (total > 0 && paid >= total) return "paid"
  if (paid > 0) return "partial"
  return "unpaid"
}

const transactionModes = ["income", "expense"]
const paymentMethodOptions = ["cash", "card", "transfer", "multi"]

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

export default function FinancePage() {
  const { t, i18n } = useTranslation("common")
  const [contracts, setContracts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState(createInitialForm)

  const locale = useMemo(() => {
    return resolveLocale(i18n.resolvedLanguage || i18n.language)
  }, [i18n.language, i18n.resolvedLanguage])

  useEffect(() => {
    let cancelled = false
    const loadFinance = async () => {
      setIsLoading(true)
      setError("")
      try {
        const [contractsResponse, transactionsResponse] = await Promise.all([
          getContracts({ limit: 1000 }),
          getERPTransactions({ limit: 200, kind: "finance" }),
        ])
        if (!cancelled) {
          setContracts(extractArrayFromResponse(contractsResponse, ["contracts"]))
          setTransactions(extractArrayFromResponse(transactionsResponse, ["transactions"]))
        }
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

  const transactionRows = useMemo(() => {
    return [...transactions].sort(
      (a, b) => new Date(b?.operation_at || b?.created_at || 0) - new Date(a?.operation_at || a?.created_at || 0),
    )
  }, [transactions])

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
      const created = await createERPTransaction({
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
      setTransactions((current) => [created, ...current])
      setForm(createInitialForm())
      setShowCreateForm(false)
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCreateForm((current) => !current)}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] shadow-sm hover:bg-[var(--surface-hover)]"
          >
            <Plus className="h-4 w-4" />
            {t("finance.transaction.add", { defaultValue: "Добавить транзакцию" })}
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
      ) : contracts.length === 0 && transactions.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-10 text-center text-[var(--text-secondary)]">
          {t("finance.empty", { defaultValue: "Пока нет реальных финансовых операций. Создайте сделку, чтобы увидеть расчёты." })}
        </div>
      ) : (
        <div className="space-y-6">
          {showCreateForm ? (
            <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] p-5 shadow-[var(--surface-shadow)]">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-[18px] font-semibold text-[var(--text-primary)]">
                  {form.mode === "income"
                    ? t("finance.transaction.formTitleIncome", { defaultValue: "Новая транзакция: приход" })
                    : t("finance.transaction.formTitleExpense", { defaultValue: "Новая транзакция: расход" })}
                </div>
                <div className="inline-flex rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1">
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

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <Field label={t("finance.transaction.fields.reason", { defaultValue: "Основание" })}>
                  <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder={t("finance.transaction.placeholders.reason", { defaultValue: "Номер документа или причина" })} className="h-11 w-full rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]" />
                </Field>
                <div className="rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-4">
                  <div className="text-[12px] text-[var(--text-secondary)]">{t("finance.transaction.preview", { defaultValue: "Маршрут операции" })}</div>
                  <div className="mt-2 text-[14px] font-medium text-[var(--text-primary)]">
                    {form.mode === "income"
                      ? `${form.counterparty || "—"} -> ${paymentMethodLabel(t, form.paymentMethod)}`
                      : `${paymentMethodLabel(t, form.paymentMethod)} -> ${form.counterparty || "—"}`}
                  </div>
                </div>
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

          <div className="overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4 text-[18px] font-semibold text-[var(--text-primary)]">
              {t("finance.transaction.journal", { defaultValue: "Единый журнал ERP транзакций" })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-[13px] text-[var(--text-primary)]">
                <thead className="bg-[var(--surface-elevated)] text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.document", { defaultValue: "Документ" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.kind", { defaultValue: "Контур" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.type", { defaultValue: "Тип" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.route", { defaultValue: "Маршрут" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.amount", { defaultValue: "Сумма" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.comment", { defaultValue: "Комментарий" })}</th>
                    <th className="px-5 py-4 text-left font-normal">{t("finance.transaction.columns.date", { defaultValue: "Дата" })}</th>
                  </tr>
                </thead>
                <tbody>
              {transactionRows.length > 0 ? transactionRows.map((item) => {
                    const currency = normalizeCurrencyCode(item?.currency || "UZS")
                    const operationAt = item?.operation_at || item?.created_at
                    const createdAt = operationAt ? new Date(operationAt).toLocaleString(locale) : "—"
                    const method = paymentMethodLabel(t, item?.payment_method || item?.metadata?.payment_method || "")
                    return (
                      <tr key={item?.id || item?.document_id} className="border-t border-[var(--border-subtle)]">
                        <td className="px-5 py-4">{item?.document_id || "—"}</td>
                        <td className="px-5 py-4">{item?.kind || "—"}</td>
                        <td className="px-5 py-4">
                          <div className="font-medium">{item?.category || item?.type || "—"}</div>
                          <div className="text-[12px] text-[var(--text-secondary)]">{item?.type || "—"}</div>
                        </td>
                        <td className="px-5 py-4">{[item?.source, item?.destination].filter(Boolean).join(" -> ") || "—"}</td>
                        <td className="px-5 py-4">
                          <div>{formatMoney(Number(item?.amount || 0), currency, locale)}</div>
                          <div className="text-[12px] text-[var(--text-secondary)]">{method}</div>
                        </td>
                        <td className="px-5 py-4">{item?.reason || item?.comment || "—"}</td>
                        <td className="px-5 py-4">{createdAt}</td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-secondary)]">
                        {t("finance.transaction.empty", { defaultValue: "Журнал ERP транзакций пока пуст." })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
