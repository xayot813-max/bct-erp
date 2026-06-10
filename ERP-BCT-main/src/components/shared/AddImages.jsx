"use client"

import React, { useState, useRef } from "react"
import { Loader2, Plus, Upload, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fileService } from "@/lib/api-services"
import { getFileUrl } from "@/lib/utils/api-helpers"
import { cn } from "@/lib/utils"
import { toastError, toastSuccess, toastWarning } from "@/lib/toast"

const allowedImageExtensions = new Set([
  "jpg",
  "jpeg",
  "jfif",
  "pjpeg",
  "pjp",
  "png",
  "apng",
  "gif",
  "webp",
  "svg",
  "avif",
  "heic",
  "heif",
  "bmp",
  "dib",
  "tif",
  "tiff",
  "ico",
])

const imageAccept = [
  "image/*",
  ".jpg",
  ".jpeg",
  ".jfif",
  ".pjpeg",
  ".pjp",
  ".png",
  ".apng",
  ".gif",
  ".webp",
  ".svg",
  ".avif",
  ".heic",
  ".heif",
  ".bmp",
  ".dib",
  ".tif",
  ".tiff",
  ".ico",
].join(",")

const getFileExtension = (filename = "") => filename.split(".").pop()?.toLowerCase() || ""

const isImageFile = (file) => {
  if (file?.type?.startsWith("image/")) return true
  return allowedImageExtensions.has(getFileExtension(file?.name))
}

export default function AddImages({
  images,
  setImages,
  maxImages = 10,
  title,
  primaryLabel,
  infoText,
  allowMultiple,
  sticky = true,
  disabled = false,
}) {
  const { t } = useTranslation("common")
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const resolvedAllowMultiple = allowMultiple ?? maxImages > 1
  const isSingleImage = !resolvedAllowMultiple || maxImages === 1
    const resolvedInfoText =
    infoText ??
    (isSingleImage
      ? t("images.singleInfo", { defaultValue: "Upload an image file. The original file is saved without compression." })
      : t("images.multipleInfo", { defaultValue: "The first image is used as the primary one." }))

  const handleImageUpload = async (event) => {
    if (disabled) {
      return
    }

    const files = Array.from(event.target.files || [])

    if (files.length === 0) {
      return
    }

    if (isSingleImage && files.length > 1) {
      toastWarning({ title: t("images.onlyOne", { defaultValue: "Only one image can be uploaded" }) })
      return
    }

    const shouldReplaceSingle = isSingleImage && images.length === maxImages

    if (!shouldReplaceSingle && files.length + images.length > maxImages) {
      toastWarning({ title: t("images.maxImages", { count: maxImages, defaultValue: `Maximum ${maxImages} images` }) })
      return
    }

    const maxSize = 50 * 1024 * 1024

    for (const file of files) {
      if (!isImageFile(file)) {
        toastWarning({
          title: t("images.invalidFormatTitle", { file: file.name, defaultValue: `Invalid format: ${file.name}` }),
          description: t("images.invalidFormatDescription", { defaultValue: "Only image files are allowed." }),
        })
        return
      }

      if (file.size > maxSize) {
        toastWarning({
          title: t("images.fileTooLargeTitle", { file: file.name, defaultValue: `File ${file.name} is too large` }),
          description: t("images.fileTooLargeDescription", { defaultValue: "Maximum size is 50MB." }),
        })
        return
      }
    }

    setUploading(true)

    try {
      let uploadResult
      if (isSingleImage) {
        const uploadedFile = await fileService.uploadSingle(files[0])
        uploadResult = {
          files: [uploadedFile],
        }
      } else {
        uploadResult = await fileService.uploadMultiple(files)
      }

      const uploadedItems = Array.isArray(uploadResult)
        ? uploadResult
        : Array.isArray(uploadResult?.files)
          ? uploadResult.files
          : []

      const newImages = uploadedItems.map((uploadedFile, index) => {
        const sourceFile = isSingleImage ? files[0] : files[index] || files[0]
        const derivedName = uploadedFile?.filename || uploadedFile?.name || sourceFile?.name || "image"
        const derivedUrl = uploadedFile?.url || uploadedFile?.path || ""

        return {
          id: `${Date.now()}_${index}_${Math.random().toString(36).slice(2)}`,
          file: sourceFile ?? null,
          preview: getFileUrl(derivedUrl),
          url: derivedUrl,
          path: derivedUrl,
          name: derivedName,
          size: uploadedFile?.size ?? sourceFile?.size,
        }
      })

      setImages((prev) => (shouldReplaceSingle ? newImages : [...prev, ...newImages]))
      toastSuccess({
        title: t("images.uploadCompleteTitle", { defaultValue: "Upload completed" }),
        description: t("images.uploadCompleteDescription", { count: newImages.length, defaultValue: `Added ${newImages.length} images.` }),
      })
    } catch (error) {
      console.error("Error uploading images:", error)
      toastError({
        title: t("images.uploadErrorTitle", { defaultValue: "Error uploading images" }),
        description: error.message,
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveImage = (id) => {
    if (disabled) {
      return
    }

    const imageToRemove = images.find((image) => image.id === id)
    if (imageToRemove?.preview?.startsWith?.("blob:")) {
      URL.revokeObjectURL(imageToRemove.preview)
    }
    setImages(images.filter((image) => image.id !== id))
  }

  const triggerFileInput = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  const buttonText = uploading
    ? t("images.uploading", { defaultValue: "Uploading..." })
    : images.length >= maxImages
      ? t("images.maxImages", { count: maxImages, defaultValue: `Maximum ${maxImages} images` })
      : isSingleImage && images.length > 0
        ? t("images.replaceImage", { defaultValue: "Replace image" })
        : t("images.addImage", { defaultValue: "Add image" })

  return (
    <Card className={cn("h-fit rounded-[12px] border border-[var(--border-default)] bg-[var(--surface)] py-3 shadow-[var(--surface-shadow)]", sticky && "sticky top-14")}>
      <CardHeader className="sr-only">
        <CardTitle>{title || t("images.title", { defaultValue: "Images" })}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-3">
        <Button
          type="button"
          variant="outline"
          className="h-[40px] w-full rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-4 text-[12px] font-medium uppercase text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
          onClick={triggerFileInput}
          disabled={disabled || ((images.length >= maxImages && !isSingleImage) || uploading)}
        >
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{buttonText}</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span className="text-center">{t("images.addPhoto", { defaultValue: "Add photo" })}</span>
                {resolvedAllowMultiple && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {images.length}/{maxImages}
                  </span>
                )}
              </>
            )}
          </div>
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={imageAccept}
          multiple={resolvedAllowMultiple}
          className="hidden"
          disabled={disabled}
          onChange={handleImageUpload}
        />

        {images.length > 0 && (
          <div className={cn("grid gap-2", isSingleImage ? "grid-cols-1" : "grid-cols-2")}>
            {images.map((image) => {
              const altText = image.name || t("images.alt", { defaultValue: "Image" })
              return (
                <div
                  key={image.id}
                  className="group relative aspect-square overflow-hidden rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] transition-colors hover:border-[var(--accent)]"
                >
                  <img
                    src={image.preview}
                    alt={altText}
                    className="h-full w-full object-cover"
                  />

                  {!disabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => handleRemoveImage(image.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {!isSingleImage && images[0]?.id === image.id && (
                    <div className="absolute left-2 top-2 rounded-md bg-primary px-2 py-1 text-xs font-medium text-white">
                      {primaryLabel || t("images.primaryLabel", { defaultValue: "Primary" })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {resolvedInfoText && (
          <p className="text-center text-xs text-[var(--text-secondary)]">{resolvedInfoText}</p>
        )}
      </CardContent>
    </Card>
  )
}
