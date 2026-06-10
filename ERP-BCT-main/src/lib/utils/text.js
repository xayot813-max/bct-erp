export const splitFullName = (value) => {
  if (!value || typeof value !== "string") {
    return { first: "", last: "" }
  }

  const parts = value
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) {
    return { first: "", last: "" }
  }

  if (parts.length === 1) {
    return { first: parts[0], last: "" }
  }

  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  }
}
