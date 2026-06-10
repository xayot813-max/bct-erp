"use client"

import { useEffect } from "react"

const RECOVERY_KEY = "bct:global-chunk-recovery"
const RECOVERY_WINDOW_MS = 30000
const CHUNK_LOAD_ERROR_PATTERN = new RegExp(
  "ChunkLoadError|Loading chunk|_next/static/chunks|dynamically imported module|module script failed",
  "i",
)

function isChunkLoadError(error) {
  const message = [error?.name, error?.message, error?.digest]
    .filter(Boolean)
    .join(" ")

  return CHUNK_LOAD_ERROR_PATTERN.test(message)
}

function canReload() {
  try {
    const lastReloadAt = Number(sessionStorage.getItem(RECOVERY_KEY) || 0)
    const now = Date.now()
    if (lastReloadAt && now - lastReloadAt < RECOVERY_WINDOW_MS) {
      return false
    }
    sessionStorage.setItem(RECOVERY_KEY, String(now))
    return true
  } catch {
    return true
  }
}

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    if (isChunkLoadError(error) && canReload()) {
      window.location.reload()
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
              onClick={() => reset()}
              style={{ border: "1px solid #d0d7e2", borderRadius: 10, padding: "10px 16px", background: "#ffffff" }}
            >
              Повторить
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
