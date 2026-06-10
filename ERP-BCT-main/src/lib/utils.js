import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


// lib/phone.js
export function formatUzPhone(input) {
  if (input == null) return "";

  const raw = String(input).replace(/\D/g, ""); // faqat raqamlar
  let cc = "+998";
  let local = raw;

  // Country kodini ajratish (har xil kirish holatlari)
  if (raw.startsWith("00998")) {
    local = raw.slice(5);
  } else if (raw.startsWith("998")) {
    local = raw.slice(3);
  } else if (raw.length === 12 && raw.startsWith("998")) {
    local = raw.slice(3);
  } else if (raw.length === 9) {
    // faqat mahalliy 9 raqam kiritilgan holat
    local = raw;
  } else if (raw.length > 9 && !raw.startsWith("998")) {
    // noma'lum format — o'zgartirmay qaytaramiz
    return String(input);
  } else if (raw.length < 9) {
    // qisqa raqamlar uchun ham formatlashni davom ettiramiz
    local = raw;
  }

  // Faqat 9 ta mahalliy raqam kerak (operator 2 + 7 abonent)
  local = local.slice(0, 9);

  const op = local.slice(0, 2);     // operator kodi (91, 90, 93, 94, 97, 98, 99, 33, 88, ...)
  const p1 = local.slice(2, 5);     // 3 raqam
  const p2 = local.slice(5, 7);     // 2 raqam
  const p3 = local.slice(7, 9);     // 2 raqam

  // Bosqichma-bosqich yig'ish (qisman kiritilganda ham chiroyli ko'rinsin)
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
