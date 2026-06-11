export const ACCESS_PERMISSIONS = [
  { id: "dashboard", path: "/dashboard", labelKey: "header.dashboard.li1", fallback: "Главная" },
  { id: "clients", path: "/dashboard/clients", labelKey: "header.dashboard.li2", fallback: "Клиенты" },
  { id: "products", path: "/dashboard/products", labelKey: "header.dashboard.li3", fallback: "Товары" },
  { id: "warehouse", path: "/dashboard/werehouses", labelKey: "header.dashboard.li4", fallback: "Склад" },
  { id: "deals", path: "/dashboard/deals", labelKey: "header.dashboard.li5", fallback: "Сделки" },
  { id: "finance", path: "/dashboard/finance", labelKey: "header.dashboard.li8", fallback: "Финансы" },
  { id: "settings", path: "/dashboard/setting", labelKey: "header.dashboard.settings", fallback: "Настройки" },
  { id: "access", path: "/dashboard/setting/access", labelKey: "settings.access.title", fallback: "Настройки доступа" },
]

const ALL_PERMISSION_IDS = ACCESS_PERMISSIONS.map((item) => item.id)

export const normalizePermissions = (value) => {
  if (!Array.isArray(value)) return []
  const allowed = new Set(ALL_PERMISSION_IDS)
  return Array.from(new Set(value.filter((item) => allowed.has(item))))
}

export const defaultPermissionsForRole = (role) => {
  switch (String(role || "").toLowerCase()) {
    case "admin":
      return [...ALL_PERMISSION_IDS]
    case "warehouse":
      return ["dashboard", "warehouse", "products"]
    case "finance":
      return ["dashboard", "finance", "deals"]
    case "viewer":
      return ["dashboard"]
    default:
      return ["dashboard", "clients", "products", "deals"]
  }
}

export const isSuperAdmin = (user) => {
  const role = String(user?.role || "").toLowerCase()
  const name = String(user?.name || "").toLowerCase()
  return role === "admin" || name === "admin"
}

export const getUserPermissions = (user) => {
  if (isSuperAdmin(user)) return ALL_PERMISSION_IDS
  const permissions = normalizePermissions(user?.permissions)
  return permissions.length > 0 ? permissions : defaultPermissionsForRole(user?.role)
}

export const hasPermission = (user, permissionId) => {
  if (!permissionId) return true
  return getUserPermissions(user).includes(permissionId)
}

export const getPermissionForPath = (pathname) => {
  if (!pathname || pathname === "/dashboard") return "dashboard"
  if (pathname === "/dashboard/setting/profile") return null
  const matches = ACCESS_PERMISSIONS
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((a, b) => b.path.length - a.path.length)
  return matches[0]?.id || null
}
