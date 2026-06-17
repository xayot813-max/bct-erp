import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


// lib/phone.js
const toPhoneInput = (input) => {
  if (input == null) return ""

  const stringValue = String(input).trim()
  if (!stringValue) return ""

  if (stringValue.startsWith("+")) {
    return `+${stringValue.slice(1).replace(/\D/g, "")}`
  }

  const digits = stringValue.replace(/\D/g, "")
  if (!digits) return ""

  if (stringValue.startsWith("00")) {
    return `+${digits.slice(2)}`
  }

  if (digits.length >= 11) {
    return `+${digits}`
  }

  return digits
}

const formatLooseLocalPhone = (digits) => {
  if (!digits) return ""

  const normalized = digits.replace(/\D/g, "").slice(0, 15)
  if (normalized.length <= 3) return normalized
  if (normalized.length <= 6) return `${normalized.slice(0, 3)} ${normalized.slice(3)}`
  if (normalized.length <= 9) return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`
  if (normalized.length <= 11) return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 8)} ${normalized.slice(8)}`

  return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9, 12)} ${normalized.slice(12)}`
}

export function formatPhoneNumber(input) {
  const prepared = toPhoneInput(input)
  if (!prepared) return ""

  if (!prepared.startsWith("+")) {
    return formatLooseLocalPhone(prepared)
  }

  const formatter = new AsYouType()
  const formatted = formatter.input(prepared)
  return formatted || prepared
}

export function normalizePhoneNumber(input) {
  const prepared = toPhoneInput(input)
  if (!prepared) return ""

  if (!prepared.startsWith("+")) {
    return prepared.replace(/\D/g, "")
  }

  const parsed = parsePhoneNumberFromString(prepared)
  return parsed?.number || prepared
}

export function isCompletePhoneNumber(input) {
  const normalized = normalizePhoneNumber(input)
  if (!normalized) return false

  if (normalized.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(normalized)
    return Boolean(parsed?.isPossible())
  }

  return normalized.replace(/\D/g, "").length >= 7
}

export function formatUzPhone(input) {
  if (input == null) return "";

  const raw = String(input).replace(/\D/g, "");
  const cc = "+998";
  let local = raw;

  if (raw.startsWith("00998")) {
    local = raw.slice(5);
  } else if (raw.startsWith("998")) {
    local = raw.slice(3);
  } else if (raw.length === 9) {
    local = raw;
  } else if (raw.length > 9) {
    local = raw.slice(-9);
  }

  local = local.slice(0, 9);

  const op = local.slice(0, 2);
  const p1 = local.slice(2, 5);
  const p2 = local.slice(5, 7);
  const p3 = local.slice(7, 9);

  let out = cc;

  if (op.length) {
    out += `(${op}`;
    if (op.length === 2) out += `)`;
  }

  if (p1.length) {
    out += `${op.length === 2 ? " " : ""}${p1}`;
  }

  if (p2.length) {
    out += `-${p2}`;
  }

  if (p3.length) {
    out += `-${p3}`;
  }

  return out;
}

export function normalizeUzPhone(input) {
  const formatted = formatUzPhone(input);
  const digits = formatted.replace(/\D/g, "");

  if (digits.startsWith("998")) {
    return `+${digits.slice(0, 12)}`;
  }

  if (!digits) {
    return "";
  }

  return `+998${digits.slice(-9)}`;
}

export function isCompleteUzPhone(input) {
  return normalizeUzPhone(input).replace(/\D/g, "").length === 12;
}
