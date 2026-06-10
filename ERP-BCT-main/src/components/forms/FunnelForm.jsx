"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CircleX, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { createFunnel, updateFunnel } from "@/lib/actions"
import { useDealStore } from "@/store/dealStore"
import { toastError, toastSuccess } from "@/lib/toast"
import BackLinkButton from "@/components/shared/BackLinkButton"
import { useTranslation } from "react-i18next"

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

const normalizeHex = (value) => {
  if (typeof value !== "string") return ""
  const trimmed = value.trim()
  const match = trimmed.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return ""
  const hex = match[1]
  if (hex.length === 3) {
    return `#${hex.split("").map((char) => char + char).join("")}`.toUpperCase()
  }
  return `#${hex}`.toUpperCase()
}

const channelToHex = (value) => Math.round(value).toString(16).padStart(2, "0")

const hsvToHex = ({ h, s, v }) => {
  const hue = (((h % 360) + 360) % 360) / 60
  const chroma = v * s
  const x = chroma * (1 - Math.abs((hue % 2) - 1))
  const match = v - chroma

  let r = 0
  let g = 0
  let b = 0

  if (hue >= 0 && hue < 1) {
    r = chroma
    g = x
  } else if (hue < 2) {
    r = x
    g = chroma
  } else if (hue < 3) {
    g = chroma
    b = x
  } else if (hue < 4) {
    g = x
    b = chroma
  } else if (hue < 5) {
    r = x
    b = chroma
  } else {
    r = chroma
    b = x
  }

  return `#${channelToHex((r + match) * 255)}${channelToHex((g + match) * 255)}${channelToHex((b + match) * 255)}`.toUpperCase()
}

const hexToHsv = (value) => {
  const normalized = normalizeHex(value) || "#FFFFFF"
  const r = parseInt(normalized.slice(1, 3), 16) / 255
  const g = parseInt(normalized.slice(3, 5), 16) / 255
  const b = parseInt(normalized.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6)
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2)
    } else {
      h = 60 * ((r - g) / delta + 4)
    }
  }

  return {
    h: Math.round((h + 360) % 360),
    s: max === 0 ? 0 : delta / max,
    v: max,
  }
}

export default function FunnelForm({
  mode = "add",
  funnelId = null,
  initialData = null,
}) {
  const router = useRouter()
  const { t } = useTranslation("common")
  const loadFunnels = useDealStore((state) => state.loadFunnels)
  const funnels = useDealStore((state) => state.funnels)
  const [submitting, setSubmitting] = useState(false)
  const [showPicker, setShowPicker] = useState(mode === "edit")
  const [pickerColor, setPickerColor] = useState(() => hexToHsv(initialData?.color || "#FFFFFF"))

  const nextOrder = useMemo(() => {
    if (!funnels || funnels.length === 0) return 1
    const maxOrder = funnels
      .map((funnel) => Number(funnel.order ?? 0))
      .reduce((acc, value) => (Number.isFinite(value) ? Math.max(acc, value) : acc), 0)
    return maxOrder + 1
  }, [funnels])

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, t("funnelForm.validation.nameRequired")),
        color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, t("funnelForm.validation.colorHex")),
        comment: z.string().optional(),
        order: z.number().min(0),
      }),
    [t],
  )

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initialData?.name || "",
      color: initialData?.color || "#FFFFFF",
      comment: initialData?.comment || "",
      order: Number(initialData?.order ?? nextOrder),
    },
  })

  const title = mode === "edit" ? t("funnelForm.titles.edit") : t("funnelForm.titles.add")
  const submitLabel = mode === "edit" ? t("dealAdd.buttons.save") : t("dealAdd.buttons.create")

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      if (mode === "edit" && funnelId) {
        await updateFunnel(funnelId, values)
        toastSuccess({ title: t("funnelForm.messages.updated") })
      } else {
        await createFunnel(values)
        toastSuccess({ title: t("funnelForm.messages.created") })
      }
      await loadFunnels(true)
      router.push("/dashboard/deals")
    } catch (error) {
      console.error("Failed to save funnel:", error)
      toastError({
        title: t("funnelForm.messages.saveError"),
        description: error?.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const colorValue = form.watch("color")

  useEffect(() => {
    const normalized = normalizeHex(colorValue)
    if (normalized) {
      setPickerColor(hexToHsv(normalized))
    }
  }, [colorValue])

  const updatePickerColor = (nextColor) => {
    const normalized = {
      h: Math.round(clamp(nextColor.h, 0, 360)),
      s: clamp(nextColor.s),
      v: clamp(nextColor.v),
    }
    setPickerColor(normalized)
    form.setValue("color", hsvToHex(normalized), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  const handleColorAreaPointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const s = clamp((event.clientX - rect.left) / rect.width)
    const v = clamp(1 - (event.clientY - rect.top) / rect.height)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    updatePickerColor({ ...pickerColor, s, v })
  }

  const handlePresetColor = (color) => {
    const normalized = normalizeHex(color)
    if (!normalized) return
    setPickerColor(hexToHsv(normalized))
    form.setValue("color", normalized, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    })
  }

  return (
    <div className="mx-auto w-[95%] max-w-[1240px] py-5">
      <div className="mb-6 flex items-center gap-4">
        <BackLinkButton href="/dashboard/deals" />
        <h1 className="text-[34px] font-normal leading-tight text-[#252936]">{title}</h1>
      </div>

      <div className="grid gap-7 lg:grid-cols-[310px_235px_270px] lg:items-start">
        <div className="rounded-md bg-white p-4 shadow-[0_1px_12px_rgba(24,28,38,0.03)]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("funnelForm.fields.name")}<span className="text-[#ff3b30]">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("funnelForm.placeholders.name")} className="h-[31px] rounded-[5px] border-[#d8dde5] bg-white px-2 text-[11px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("funnelForm.fields.color")}<span className="text-[#ff3b30]">*</span></FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input {...field} className="h-[31px] rounded-[5px] border-[#d8dde5] bg-white px-2 pr-12 text-[11px]" />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPicker((prev) => !prev)}
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 rounded border border-[#d8dde5]"
                        style={{ backgroundColor: colorValue }}
                        aria-label={t("funnelForm.aria.pickColor")}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-medium text-[#20242d]">{t("funnelForm.fields.comment")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder={t("funnelForm.placeholders.comment")} className="min-h-[115px] rounded-[5px] border-[#d8dde5] bg-white px-2 py-2 text-[11px]" />
                    </FormControl>
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={submitting}
            className="h-9 w-full gap-2 rounded-md bg-black text-[12px] text-white hover:bg-[#20232c]"
          >
            <Plus className="h-3.5 w-3.5" />
            {submitLabel}
          </Button>
          <Button
            type="button"
            onClick={() => router.push("/dashboard/deals")}
            disabled={submitting}
            className="h-9 w-full gap-2 rounded-md bg-black text-[12px] text-white hover:bg-[#20232c]"
          >
            <CircleX className="h-3.5 w-3.5" />
            {t("common.cancel")}
          </Button>
        </div>

        {showPicker && (
          <div className="rounded-2xl bg-white p-4 shadow-[0_16px_34px_rgba(31,34,43,0.18)]">
            <div
              className="relative h-[172px] cursor-crosshair rounded-md border border-[#e8eaee]"
              onPointerDown={handleColorAreaPointer}
              onPointerMove={(event) => {
                if (event.buttons === 1) {
                  handleColorAreaPointer(event)
                }
              }}
              style={{
                background:
                  `linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, transparent 100%), hsl(${pickerColor.h}, 100%, 50%)`,
              }}
            >
              <span
                className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
                style={{
                  left: `${pickerColor.s * 100}%`,
                  top: `${(1 - pickerColor.v) * 100}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              {["#ff4d21", "#f5a623", "#7ed321", "#50e3c2", "#4a90e2", "#bd10e0", "#ff0080"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetColor(color)}
                  className="h-3 w-3 rounded-full border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={pickerColor.h}
              onChange={(event) => updatePickerColor({ ...pickerColor, h: Number(event.target.value) })}
              className="mt-2 w-full accent-[#ff00b8]"
            />
          </div>
        )}
      </div>
    </div>
  )
}
