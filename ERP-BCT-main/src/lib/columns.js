// columns-factory.jsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { toastError, toastSuccess } from "@/lib/toast";
import { formatUzPhone } from "./utils";
import { getLocalizedValue } from "@/lib/multilingual";
import { formatUSD } from "@/lib/utils/currency";
import {
  deleteCategory,
  deleteClient,
  deleteCompany,
  deleteCounterparty,
  deleteProduct,
} from "@/lib/actions";

const API_BASE_URL = "https://q-bit.uz";

const normalizeImageUrl = (value) => {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith("http")) return value;
  return value.startsWith("/")
    ? `${API_BASE_URL}${value}`
    : `${API_BASE_URL}/${value}`;
};

const resolveImageUrl = (input) => {
  if (!input) return null;

  if (Array.isArray(input)) {
    for (const item of input) {
      const candidate = resolveImageUrl(item);
      if (candidate) return candidate;
    }
    return null;
  }

  if (typeof input === "string") {
    return normalizeImageUrl(input);
  }

  if (typeof input === "object") {
    return (
      normalizeImageUrl(input.preview) ||
      normalizeImageUrl(input.url) ||
      normalizeImageUrl(input.path)
    );
  }

  return null;
};

const translate = (t, key, fallback) => {
  if (typeof t === "function") {
    const value = t(key);
    if (value && value !== key) {
      return value;
    }
  }
  return fallback ?? key;
};

const formatMoney = (value, locale = "ru-RU", suffix = "sum") =>
  `${Number(value ?? 0).toLocaleString(locale)} ${suffix}`;

const resolveOrderHistory = (record) =>
  Array.isArray(record?.order_history)
    ? record.order_history
    : Array.isArray(record?.orderHistory)
      ? record.orderHistory
      : [];

const resolveRealOrderCount = (record) => {
  const history = resolveOrderHistory(record);
  if (history.length > 0) return history.length;
  return Number(record?.order_count ?? record?.orders_count ?? 0);
};

const resolveRealTotalAmount = (record) => {
  const history = resolveOrderHistory(record);
  if (history.length > 0) {
    return history.reduce((sum, entry) => sum + Number(entry?.price ?? entry?.total ?? 0), 0);
  }
  return Number(record?.total_amount ?? 0);
};

const resolveEntityId = (record) =>
  record?.id ||
  record?._id ||
  record?.uuid ||
  record?.guid ||
  record?.ID ||
  record?.Id ||
  null;

const tableActionButtonClass =
  "h-7 w-7 rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-elevated)] p-0 text-[var(--text-secondary)] shadow-none transition-colors hover:border-[var(--accent)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";

const tableActionIconClass = "h-3.5 w-3.5";

function DeleteEntityAction({
  id,
  label,
  title,
  description,
  action,
  cancelText = "Cancel",
  deletingText = "Deleting...",
  confirmText = "Delete",
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!id || isDeleting) return;

    setIsDeleting(true);
    try {
      await action(id);
      toastSuccess({ title: `${label} deleted` });
      router.refresh();
    } catch (error) {
      toastError({
        title: `Failed to delete ${label.toLowerCase()}`,
        description: error?.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          className={tableActionButtonClass}
          size="icon"
          variant="ghost"
          disabled={!id || isDeleting}
          title={`Delete ${label.toLowerCase()}`}
        >
          <Trash2 className={tableActionIconClass} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? deletingText : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// --- CLIENTS ---
export const getClientsColumns = (t) => [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "name",
    header: translate(t, "clients.columns.name", "Имя"),
    cell: ({ row }) => {
      const client = row.original
      const first = client.first_name || client.firstname || ""
      const last = client.last_name || client.lastname || ""
      const fullName = [first, last].filter(Boolean).join(" ").trim()
      return fullName || client.name || "—"
    },
  },
  {
    accessorKey: "orders",
    header: translate(t, "clients.columns.orders", "Заказы"),
    cell: ({ row }) => {
      const count = resolveRealOrderCount(row.original)
      return (
        <span className="inline-flex items-center gap-1">
          <span className={count > 0 ? "h-1.5 w-1.5 rounded-full bg-[#4DBB47]" : "h-1.5 w-1.5 rounded-full bg-[#4F5663]"} />
          {translate(t, "clients.columns.ordersCount_other", "{{count}} заказов").replace("{{count}}", count)}
        </span>
      )
    },
  },
  {
    accessorKey: "total_amount",
    header: translate(t, "clients.columns.totalAmount", "Общая сумма покупок"),
    cell: ({ row }) => formatMoney(resolveRealTotalAmount(row.original)),
  },
  {
    accessorKey: "phone",
    header: translate(t, "clients.columns.phone", "Телефон"),
    cell: ({ row }) => <span>{formatUzPhone(row.original.phone)}</span>,
  },
  {
    accessorKey: "email",
    header: translate(t, "clients.columns.email", "Email"),
    cell: ({ row }) => row.original.email || "—",
  },
  {
    id: "actions",
    header: translate(t, "clients.columns.actions", "Действия"),
    cell: ({ row }) => {
      const client = row.original
      const clientId = resolveEntityId(client)

      return (
        <div className="w-full flex gap-2 justify-end">
          <Link href={clientId ? `/dashboard/clients/${clientId}?type=show` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <ArrowUpRight className={tableActionIconClass} />
            </Button>
          </Link>

          <Link href={clientId ? `/dashboard/clients/${clientId}?type=edit` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <Pencil className={tableActionIconClass} />
            </Button>
          </Link>

          <DeleteEntityAction
            id={clientId}
            label={translate(t, "clients.entityLabel", "Client")}
            title={translate(t, "clients.dialog.deleteTitle", "Удалить клиента?")}
            description={translate(t, "clients.dialog.deleteDesc", "Клиент будет удалён без возможности восстановления.")}
            action={deleteClient}
            cancelText={translate(t, "clients.dialog.cancel", "Отмена")}
            confirmText={translate(t, "clients.dialog.confirm", "Удалить")}
            deletingText={translate(t, "common.deleting", "Удаление...")}
          />
        </div>
      )
    },
  },
]

export const getCompaniesColumns = (t) => [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "name",
    header: translate(t, "companies.columns.name", "Название"),
    cell: ({ row }) => row.original.name || "—",
  },
  {
    accessorKey: "orders",
    header: translate(t, "companies.columns.orders", "Заказы"),
    cell: ({ row }) => {
      const count = resolveRealOrderCount(row.original)
      return (
        <span className="inline-flex items-center gap-1">
          <span className={count > 0 ? "h-1.5 w-1.5 rounded-full bg-[#4DBB47]" : "h-1.5 w-1.5 rounded-full bg-[#4F5663]"} />
          {translate(t, "companies.columns.ordersCount_other", "{{count}} заказов").replace("{{count}}", count)}
        </span>
      )
    },
  },
  {
    accessorKey: "total_amount",
    header: translate(t, "companies.columns.totalAmount", "Общая сумма покупок"),
    cell: ({ row }) => formatMoney(resolveRealTotalAmount(row.original)),
  },
  {
    accessorKey: "phone",
    header: translate(t, "companies.columns.phone", "Телефон"),
    cell: ({ row }) => <span>{formatUzPhone(row.original.phone)}</span>,
  },
  {
    accessorKey: "email",
    header: translate(t, "companies.columns.email", "Электронная почта"),
    cell: ({ row }) => row.original.email || "—",
  },
  {
    id: "actions",
    header: translate(t, "companies.columns.actions", "Действия"),
    cell: ({ row }) => {
      const company = row.original
      const companyId = resolveEntityId(company)
      return (
        <div className="w-full flex gap-2 justify-end">
          <Link href={companyId ? `/dashboard/companies/${companyId}?type=show` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <ArrowUpRight className={tableActionIconClass} />
            </Button>
          </Link>
          <Link href={companyId ? `/dashboard/companies/${companyId}?type=edit` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <Pencil className={tableActionIconClass} />
            </Button>
          </Link>
          <DeleteEntityAction
            id={companyId}
            label={translate(t, "companies.entityLabel", "Company")}
            title={translate(t, "companies.dialog.deleteTitle", "Удалить компанию?")}
            description={translate(t, "companies.dialog.deleteDesc", "Компания будет удалена без возможности восстановления.")}
            action={deleteCompany}
            cancelText={translate(t, "companies.dialog.cancel", "Отмена")}
            confirmText={translate(t, "companies.dialog.confirm", "Удалить")}
            deletingText={translate(t, "common.deleting", "Удаление...")}
          />
        </div>
      )
    },
  },
]

export const getCounterpartiesColumns = (t) => [
  {
    accessorKey: "name",
    header: translate(t, "counterparties.columns.name", "Контрагент"),
    cell: ({ row }) => {
      const counterparty = row.original
      const first = counterparty.first_name || counterparty.firstname || ""
      const last = counterparty.last_name || counterparty.lastname || ""
      const fullName = [first, last].filter(Boolean).join(" ").trim()
      return fullName || counterparty.name || "—"
    },
  },
  {
    accessorKey: "company",
    header: translate(t, "counterparties.columns.company", "Компания"),
    cell: ({ row }) => row.original.company || "—",
  },
  {
    accessorKey: "phone",
    header: translate(t, "counterparties.columns.phone", "Телефон"),
    cell: ({ row }) => <span>{formatUzPhone(row.original.phone)}</span>,
  },
  {
    accessorKey: "email",
    header: translate(t, "counterparties.columns.email", "Email"),
    cell: ({ row }) => row.original.email || "—",
  },
  {
    id: "actions",
    header: translate(t, "counterparties.columns.actions", "Действия"),
    cell: ({ row }) => {
      const counterparty = row.original
      const counterpartyId = resolveEntityId(counterparty)
      return (
        <div className="w-full flex gap-2 justify-end">
          <Link href={counterpartyId ? `/dashboard/counterparties/${counterpartyId}?type=show` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <ArrowUpRight className={tableActionIconClass} />
            </Button>
          </Link>
          <Link href={counterpartyId ? `/dashboard/counterparties/${counterpartyId}?type=edit` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <Pencil className={tableActionIconClass} />
            </Button>
          </Link>
        </div>
      )
    },
  },
]

// --- SERIAL ---
export const getSerialColumns = (t) => [
  { accessorKey: "id", header: t("serial.columns.id") },
  { accessorKey: "name", header: t("serial.columns.name") },
  { accessorKey: "serial_number", header: t("serial.columns.serial_number") },
  { accessorKey: "date_create", header: t("serial.columns.date_create") },
  { accessorKey: "date_warranty", header: t("serial.columns.date_warranty") },
  {
    accessorKey: "price", header: t("serial.columns.price"), cell: ({ row }) => {
      const price = row.original.price || 0;
      return (
        <h1>{price?.toLocaleString()}</h1>
      );
    },
  },
];

// --- PRODUCTS ---
export const getProductsColumns = (t, language = "ru") => [
  {
    accessorKey: "index",
    header: "#",
    cell: ({ row }) => {
      return row.index + 1;
    },
  },
  {
    accessorKey: "name",
    header: translate(t, "products.columns.name", "Название"),
    cell: ({ row }) => getLocalizedValue(row.original.name, language) || "—",
  },
  {
    accessorKey: "category_name",
    header: translate(t, "products.columns.type", "Тип товара"),
    cell: ({ row }) => {
      const category =
        row.original.category_name ||
        row.original.category?.name ||
        row.original.category ||
        "";
      return getLocalizedValue(category, language) || "—";
    },
  },
  {
    accessorKey: "createdAt",
    header: translate(t, "products.columns.dateAdded", "Дата добавления"),
    cell: ({ row }) => {
      const value = row.original.createdAt || row.original.created_at;
      return value ? new Date(value).toLocaleDateString(language === "en" ? "en-US" : language === "uz" ? "uz-UZ" : "ru-RU") : "07/07/2025";
    },
  },
  {
    accessorKey: "price",
    header: translate(t, "products.columns.price", "Цена"),
    cell: ({ row }) => {
      const price = row.original.price || 0;
      const locale = language === "en" ? "en-US" : language === "uz" ? "uz-UZ" : "ru-RU"
      const suffix = translate(t, "products.currency", language === "uz" ? "so'm" : language === "en" ? "sum" : "сум")
      return (
        <span>{formatMoney(price, locale, suffix)}</span>
      );
    },
  },
  {
    id: "actions",
    header: t("products.columns.actions"),
    cell: ({ row }) => {
      const product = row.original;
      const productId = resolveEntityId(product);

      return (
        <div className="w-full flex gap-2 justify-end">
          <Link href={productId ? `/dashboard/products/${productId}?type=show` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <ArrowUpRight className={tableActionIconClass} />
            </Button>
          </Link>

          <Link href={productId ? `/dashboard/products/${productId}?type=edit` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <Pencil className={tableActionIconClass} />
            </Button>
          </Link>

          <DeleteEntityAction
            id={productId}
            label={translate(t, "products.entityLabel", "Product")}
            title={t("products.dialog.deleteTitle")}
            description={t("products.dialog.deleteDesc")}
            action={deleteProduct}
            cancelText={translate(t, "products.dialog.cancel", "Отмена")}
            confirmText={translate(t, "products.dialog.confirm", "Удалить")}
            deletingText={translate(t, "common.deleting", "Удаление...")}
          />
        </div>
      );
    },
  },
];

export const getCategoriesColumns = (t, language = "ru") => [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "title",
    header: translate(t, "categories.columns.name", "Название"),
    cell: ({ row }) => {
      const value = row.original.title || row.original.name || "";
      return getLocalizedValue(value, language) || "—";
    },
  },
  {
    accessorKey: "description",
    header: translate(t, "categories.columns.description", "Описание"),
    cell: ({ row }) =>
      (() => {
        const description = row.original.description || "";
        const localized = getLocalizedValue(description, language);
        if (!localized) return "—";
        const text = localized.slice(0, 120);
        return localized.length > 120 ? `${text}…` : text;
      })(),
  },
  {
    id: "actions",
    header: translate(t, "categories.columns.actions", "Действия"),
    cell: ({ row }) => {
      const category = row.original;
      const categoryId = resolveEntityId(category);

      return (
        <div className="w-full flex gap-2 justify-end">
          <Link href={categoryId ? `/dashboard/products/categories/${categoryId}?type=edit` : "#"}>
            <Button className={tableActionButtonClass} size="icon" variant="ghost">
              <Pencil className={tableActionIconClass} />
            </Button>
          </Link>

          <DeleteEntityAction
            id={categoryId}
            label={translate(t, "categories.entityLabel", "Category")}
            title={translate(t, "categories.dialog.deleteTitle", "Удалить категорию?")}
            description={translate(t, "categories.dialog.deleteDesc", "Категория будет удалена без возможности восстановления.")}
            action={deleteCategory}
            cancelText={translate(t, "categories.dialog.cancel", "Отмена")}
            confirmText={translate(t, "categories.dialog.confirm", "Удалить")}
            deletingText={translate(t, "common.deleting", "Удаление...")}
          />
        </div>
      );
    },
  },
];

export const getContractsColumns = (t) => [
  {
    accessorKey: "contract_number",
    header: translate(t, "contracts.columns.number", "Номер"),
    cell: ({ row }) => row.original.contract_number || row.original.number || "—",
  },
  {
    accessorKey: "client",
    header: translate(t, "contracts.columns.client", "Клиент"),
    cell: ({ row }) => {
      const client = row.original.client || row.original.client_name || row.original.client_full_name
      if (typeof client === "string") return client
      if (client && typeof client === "object") {
        const first = client.first_name || client.firstname || ""
        const last = client.last_name || client.lastname || ""
        const combined = [first, last].filter(Boolean).join(" ").trim()
        return combined || client.name || client.company || "—"
      }
      return "—"
    },
  },
  {
    accessorKey: "company",
    header: translate(t, "contracts.columns.company", "Компания"),
    cell: ({ row }) => {
      const company = row.original.company || row.original.company_name
      if (typeof company === "string") return company
      if (company && typeof company === "object" && company.name) {
        return company.name
      }
      return "—"
    },
  },
  {
    accessorKey: "contract_amount",
    header: translate(t, "contracts.columns.amount", "Сумма"),
    cell: ({ row }) => {
      const amount = Number(row.original.contract_amount ?? row.original.amount ?? 0)
      return amount ? amount.toLocaleString() : "0"
    },
  },
  {
    accessorKey: "contract_currency",
    header: translate(t, "contracts.columns.currency", "Валюта"),
    cell: ({ row }) => row.original.contract_currency || row.original.currency || "—",
  },
  {
    accessorKey: "deal_date",
    header: translate(t, "contracts.columns.dealDate", "Дата сделки"),
    cell: ({ row }) => {
      const value =
        row.original.deal_date ||
        row.original.created_at ||
        row.original.createdAt ||
        null
      return value ? new Date(value).toLocaleDateString() : "—"
    },
  },
]
