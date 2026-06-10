"use server"

import { NextResponse } from "next/server"

const normalizeBase = (value) => {
  if (!value || typeof value !== "string") return ""
  return value.trim().replace(/\/+$/, "")
}

const resolveApiBaseUrl = () => {
  const candidates = [
    normalizeBase(process.env.NEXT_PUBLIC_BASE_URL),
    normalizeBase(process.env.NEXT_PUBLIC_API_BASE_URL),
    normalizeBase(process.env.API_BASE_URL),
    normalizeBase(process.env.BASE_URL),
    "http://localhost:9000/api",
  ].filter(Boolean)

  return candidates[0] || "http://localhost:9000/api"
}

const API_BASE = resolveApiBaseUrl().replace(/\/$/, "")
const UPLOAD_SINGLE_URL = `${API_BASE}/files/upload`
const UPLOAD_MULTI_URL = `${API_BASE}/files/upload-multiple`

const buildUpstreamHeaders = (request) => {
  const headers = {}
  const cookie = request.headers.get("cookie")
  const authorization = request.headers.get("authorization")

  if (cookie) headers.cookie = cookie
  if (authorization) headers.authorization = authorization

  return headers
}

const pickUploadUrl = (formData) => {
  const hasFiles =
    formData.getAll("files").length > 0 ||
    formData.getAll("files[]").length > 0
  return hasFiles ? UPLOAD_MULTI_URL : UPLOAD_SINGLE_URL
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    const targetUrl = pickUploadUrl(formData)
    const headers = buildUpstreamHeaders(request)

    const upstreamResponse = await fetch(targetUrl, {
      method: "POST",
      body: formData,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    })

    const contentType = upstreamResponse.headers.get("content-type") || ""
    const payload = contentType.includes("application/json")
      ? await upstreamResponse.json()
      : await upstreamResponse.text()

    if (!upstreamResponse.ok) {
      const body =
        typeof payload === "string"
          ? { message: payload || "Upload failed" }
          : payload
      return NextResponse.json(body, { status: upstreamResponse.status })
    }

    return NextResponse.json(payload, { status: upstreamResponse.status })
  } catch (error) {
    console.error("Upload proxy error:", error)
    return NextResponse.json(
      {
        message: "Upload proxy failed",
        detail: error.message,
      },
      { status: 500 },
    )
  }
}

