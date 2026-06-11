"use client"

import { useEffect } from "react"

const RECOVERY_KEY = "bct:global-chunk-recovery:v2"
const RECOVERY_WINDOW_MS = 15000
const MAX_RECOVERY_ATTEMPTS = 3
const CHUNK_LOAD_ERROR_PATTERN = new RegExp(
  [
    "ChunkLoadError",
    "Loading chunk",
    "_next/static/chunks",
    "dynamically imported module",
    "module script failed",
    "failed to fetch dynamically imported module",
    "importing a module script failed",
    "application update",
    "application updated",
  ].join("|"),
  "i",
)

function getErrorMessage(error) {
  return [
    error?.name,
    error?.message,
    error?.digest,
    error?.stack,
    error?.cause?.name,
    error?.cause?.message,
  ]
    .filter(Boolean)
    .join(" ")
}

function isChunkLoadError(error) {
  return CHUNK_LOAD_ERROR_PATTERN.test(getErrorMessage(error))
}

function canReload() {
  try {
    const state = JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || "{}")
    const lastReloadAt = Number(state.at || 0)
    const attempts = Number(state.attempts || 0)
    const now = Date.now()
    if (lastReloadAt && now - lastReloadAt < RECOVERY_WINDOW_MS) {
      return false
    }
    if (attempts >= MAX_RECOVERY_ATTEMPTS) {
      return false
    }
    sessionStorage.setItem(RECOVERY_KEY, JSON.stringify({ at: now, attempts: attempts + 1 }))
    return true
  } catch {
    return true
  }
}

function clearBrowserCaches() {
  try {
    if ("caches" in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key))
      })
    }
  } catch {}

  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister())
      })
    }
  } catch {}
}

function cleanCurrentUrl() {
  const url = new URL(window.location.href)
  url.searchParams.delete("__bct_reload")
  return url
}

function reloadPage({ force = false } = {}) {
  clearBrowserCaches()
  const url = cleanCurrentUrl()
  if (force) {
    try {
      sessionStorage.removeItem(RECOVERY_KEY)
    } catch {}
  }
  try {
    window.history.replaceState(window.history.state, "", url.toString())
  } catch {}
  window.location.replace(url.toString())
}

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if ((isChunkLoadError(error) || process.env.NODE_ENV === "production") && canReload()) {
      reloadPage()
    }
  }, [error])

  return (
    <html lang="ru">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center", fontFamily: "sans-serif" }}>
            <h1 style={{ fontSize: 24, marginBottom: 12 }}>Не удалось загрузить страницу</h1>
            <p style={{ marginBottom: 20, color: "#5f6673" }}>
              Приложение обновилось. Обновите страницу, чтобы загрузить актуальную версию.
            </p>
            <button
              type="button"
              onClick={() => reloadPage({ force: true })}
              style={{ border: "1px solid #d0d7e2", borderRadius: 10, padding: "10px 16px", background: "#ffffff" }}
            >
              Обновить страницу
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
