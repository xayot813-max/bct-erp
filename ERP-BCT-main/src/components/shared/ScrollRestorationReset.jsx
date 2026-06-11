"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"

export default function ScrollRestorationReset() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual"
    }
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    const scrollContainers = document.querySelectorAll("[data-route-scroll-container]")
    scrollContainers.forEach((container) => {
      container.scrollTop = 0
      container.scrollLeft = 0
    })
  }, [pathname, searchParams])

  return null
}
