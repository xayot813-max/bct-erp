const getCookieValue = (name) => {
  if (typeof document === "undefined") return ""

  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ""
}

export const getCurrentAdminProfile = () => {
  try {
    const raw = getCookieValue("authData")
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    return parsed
  } catch {
    return null
  }
}

export const getCurrentAdminProfileId = () => {
  const profile = getCurrentAdminProfile()
  const id = profile?.id || profile?._id || ""
  return typeof id === "string" ? id : ""
}

export const getCurrentAccessToken = () => getCookieValue("accessToken")
