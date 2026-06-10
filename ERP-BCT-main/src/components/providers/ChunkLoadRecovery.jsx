"use client"

import { useEffect } from "react"

const RECOVERY_KEY = "bct:chunk-load-recovery"
const RECOVERY_WINDOW_MS = 30000
const CHUNK_LOAD_ERROR_PATTERN = new RegExp(
  "ChunkLoadError|Loading chunk|_next/static/chunks|dynamically imported module|module script failed",
  "i",
)

function getMessage(error) {
  if (!error) return ""
  if (typeof error === "string") return error
  return [
    error.name,
    error.message,
    error.reason?.name,
    error.reason?.message,
    error.error?.name,
    error.error?.message,
    error.target?.src,
  ]
    .filter(Boolean)
    .join(" ")
}

function isChunkLoadError(error) {
  const message = getMessage(error)
  return CHUNK_LOAD_ERROR_PATTERN.test(message)
}

function shouldReloadOnce() {
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

export default function ChunkLoadRecovery() {
  useEffect(() => {
    const recover = (event) => {
      if (!isChunkLoadError(event) || !shouldReloadOnce()) return
      window.location.reload()
    }

    window.addEventListener("error", recover, true)
    window.addEventListener("unhandledrejection", recover)

    return () => {
      window.removeEventListener("error", recover, true)
      window.removeEventListener("unhandledrejection", recover)
    }
  }, [])

  return null
}
