"use client"

import { useRef } from "react"
import { FilePlus2, Printer } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

type HeaderActionsProps = {
  onPrintContract?: () => void
  onAddDocument?: (files: FileList) => void
  onCalculateTax?: () => void
}

export default function HeaderActions({
  onPrintContract,
  onAddDocument,
  onCalculateTax,
}: HeaderActionsProps) {
  const { t } = useTranslation("common")
  const documentInputRef = useRef<HTMLInputElement | null>(null)

  const handleDocumentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      onAddDocument?.(files)
    }
    event.target.value = ""
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-10 gap-2 rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)] hover:bg-[var(--surface-hover)]"
        onClick={onPrintContract}
      >
        <Printer className="h-4 w-4" />
        {t("common.printContract", { defaultValue: "Print contract" })}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-10 gap-2 rounded-[10px] border-[var(--border-default)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-primary)] shadow-[var(--surface-shadow)] hover:bg-[var(--surface-hover)]"
        onClick={() => documentInputRef.current?.click()}
      >
        <FilePlus2 className="h-4 w-4" />
        {t("common.addDocument", { defaultValue: "Add document" })}
      </Button>
      <input
        ref={documentInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*,.jpg,.jpeg,.jfif,.pjpeg,.pjp,.png,.apng,.gif,.webp,.svg,.avif,.heic,.heif,.bmp,.dib,.tif,.tiff,.ico"
        onChange={handleDocumentChange}
      />
    </div>
  )
}
