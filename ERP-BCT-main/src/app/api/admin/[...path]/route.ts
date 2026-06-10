import { NextRequest, NextResponse } from "next/server"

const DEFAULT_ADMIN_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:9000/api"

const ADMIN_BASE_URL = DEFAULT_ADMIN_BASE.replace(/\/$/, "")

const resolveAdminOrigin = () => {
  try {
    return new URL(ADMIN_BASE_URL).origin
  } catch {
    return "http://localhost:9000"
  }
}

const ADMIN_BASE_ORIGIN = resolveAdminOrigin()

const FORBIDDEN_REQUEST_HEADERS = new Set(["host", "content-length"])
const STRIP_RESPONSE_HEADERS = new Set([
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "content-length",
  "transfer-encoding",
])

async function forward(request: NextRequest, segments: string[]) {
  const search = request.nextUrl.search || ""
  const path = segments.filter(Boolean).join("/")
  const adminPath = path ? `admin/${path}` : "admin"
  const targetUrl = new URL(`${adminPath}${search}`, `${ADMIN_BASE_URL}/`)

  const headers = new Headers()
  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (FORBIDDEN_REQUEST_HEADERS.has(lowerKey)) return
    if (lowerKey === "connection") return
    headers.set(key, value)
  })

  const pathnameForReferer = `/${adminPath}`
  headers.set("origin", ADMIN_BASE_ORIGIN)
  headers.set("referer", `${ADMIN_BASE_URL}${pathnameForReferer}${search}`)

  const hasBody = !["GET", "HEAD"].includes(request.method)
  const body = hasBody ? await request.arrayBuffer() : undefined

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  })

  const responseBody = await response.arrayBuffer()
  const nextResponse = new NextResponse(responseBody, { status: response.status })

  response.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase()
    if (STRIP_RESPONSE_HEADERS.has(lowerKey)) return
    if (lowerKey === "set-cookie") {
      nextResponse.headers.append(key, value)
    } else {
      nextResponse.headers.set(key, value)
    }
  })

  return nextResponse
}

const getSegments = async (context: any): Promise<string[]> => {
  if (!context || !("params" in context)) {
    return []
  }
  const paramsCandidate = context.params
  let paramsValue = paramsCandidate
  if (typeof paramsCandidate?.then === "function") {
    paramsValue = await paramsCandidate
  }
  const pathValue = paramsValue?.path
  return Array.isArray(pathValue) ? pathValue : []
}

export async function GET(request: NextRequest, context: any) {
  const segments = await getSegments(context)
  return forward(request, segments)
}

export async function POST(request: NextRequest, context: any) {
  const segments = await getSegments(context)
  return forward(request, segments)
}

export async function PUT(request: NextRequest, context: any) {
  const segments = await getSegments(context)
  return forward(request, segments)
}

export async function PATCH(request: NextRequest, context: any) {
  const segments = await getSegments(context)
  return forward(request, segments)
}

export async function DELETE(request: NextRequest, context: any) {
  const segments = await getSegments(context)
  return forward(request, segments)
}

export async function OPTIONS(request: NextRequest, context: any) {
  const segments = await getSegments(context)
  return forward(request, segments)
}
