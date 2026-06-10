"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"

const menuItems = [
  { key: "newOrder", link: "/dashboard/deals/add?returnTo=/dashboard" },
  { key: "deal", link: "/dashboard/deals" },
  { key: "clients", link: "/dashboard/clients" },
  { key: "products", link: "/dashboard/products" },
  { key: "warehouse", link: "/dashboard/werehouses" },
]

export default function MenuComponent() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-[95%] max-w-[1240px] pt-8 md:pt-10">
      <h1 className="text-[clamp(42px,4vw,58px)] font-normal leading-[0.95] tracking-[-0.045em] text-[var(--text-primary)]">
        {t("homePage.page.homeTitle")}
      </h1>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {menuItems.map((item) => (
          <Link
            key={item.key}
            href={item.link}
            className="group flex min-h-[128px] flex-col justify-center rounded-[12px] bg-[var(--menu-card)] px-4 py-5 text-white shadow-[0_18px_36px_rgba(17,24,39,0.08)] ring-1 ring-white/5 transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--menu-card-hover)] hover:shadow-[0_22px_44px_rgba(17,24,39,0.12)]"
          >
            <span className="text-[clamp(25px,1.75vw,31px)] font-normal leading-[0.95] tracking-[-0.04em]">
              {t(`homePage.menu.${item.key}.title`)}
            </span>
            <span className="mt-3 line-clamp-2 text-[12px] leading-[1.45] text-white/82">
              {t(`homePage.menu.${item.key}.desc`)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
