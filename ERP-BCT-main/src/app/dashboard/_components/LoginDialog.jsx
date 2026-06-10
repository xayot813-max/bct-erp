"use client";

import React, { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import CustomFormField, { FormFieldType } from "@/components/shared/customFormField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogOverlay, // agar sizning dialog.tsx export qilsa
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import { adminService } from "@/lib/api-services";
import { toast } from "sonner";
import { toastError, toastSuccess, toastLoading } from "@/lib/toast";
import { useAuth } from "@/components/providers/AuthProvider";

export default function LoginDialog() {
  const { t } = useTranslation()
  const { isAuthenticated, refreshFromCookies } = useAuth()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const LoginValidation = useMemo(() => z.object({
    name: z
      .string()
      .trim()
      .min(3, t("login.error.name", { defaultValue: t("login.error.phone") })),
    password: z.string().min(1, t("login.error.password")),
  }), [t])

  const form = useForm({
    resolver: zodResolver(LoginValidation),
    defaultValues: { name: "", password: "" },
    mode: "onSubmit",
  });

  useEffect(() => {
    setOpen(!isAuthenticated)
  }, [isAuthenticated])

  const onSubmit = async (values) => {
    if (isSubmitting) return
    setIsSubmitting(true)
    const loadingId = toastLoading({
      title: t("login.loadingTitle", { defaultValue: "Авторизация..." }),
      description: t("login.loadingDescription", { defaultValue: "Проверяем учетные данные" }),
    })

    try {
      const payload = {
        name: values.name.trim(),
        password: values.password,
      }
      const result = await adminService.login(payload)

      const cookieOptions = {
        expires: 7,
        sameSite: "lax",
        path: "/",
        secure: typeof window !== "undefined" && window.location.protocol === "https:",
      }

      Cookies.set("authData", JSON.stringify(result.admin), cookieOptions)
      Cookies.set("accessToken", result.token, cookieOptions)

      toastSuccess({
        title: t("login.successTitle", { defaultValue: "Добро пожаловать!" }),
        description: t("login.successDescription", { defaultValue: "Вы успешно вошли в систему." }),
      })

      setOpen(false)
      form.reset()
      refreshFromCookies()
    } catch (error) {
      console.error("Admin login failed:", error)
      toastError({
        title: t("login.errorTitle", { defaultValue: "Не удалось войти" }),
        description: error.message || t("login.errorDescription", { defaultValue: "Проверьте логин и пароль." }),
      })
    } finally {
      toast.dismiss(loadingId)
      setIsSubmitting(false)
    }
  }

  const handleDialogChange = (nextState) => {
    if (!nextState && !isAuthenticated) return
    setOpen(nextState)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogChange}>
        <DialogTrigger asChild>
          <Button className={"pt-0 hidden"} variant="default">Войти</Button>
        </DialogTrigger>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/5 data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <DialogContent position="top" className="mt-[72px] z-50 w-[420px] max-w-[calc(100vw-32px)] gap-0 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface)] px-7 py-6 shadow-[0_18px_44px_rgba(24,27,36,0.26)]">
          <DialogHeader className="p-0 text-left">
            <DialogTitle className="text-[22px] font-medium leading-none text-[var(--text-primary)]">{t("login.title")}</DialogTitle>
            <DialogDescription className="sr-only">Введите логин и пароль</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-5 space-y-4"
            >
              <div className="flex flex-col gap-2">
                <CustomFormField
                  fieldType={FormFieldType.INPUT}
                  control={form.control}
                  name="name"
                  label={t("login.form.label.name", { defaultValue: "Логин" })}
                  labelClass="mb-1 text-[13px] font-medium text-[var(--text-secondary)]"
                  placeholder={t("login.form.placeholder.name", { defaultValue: "" })}
                  inputClass="h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)]"
                />

                <CustomFormField
                  fieldType={FormFieldType.PASSWORDINPUT}
                  control={form.control}
                  name="password"
                  label={t("login.form.label.password")}
                  labelClass="mb-1 text-[13px] font-medium text-[var(--text-secondary)]"
                  placeholder="******"
                  inputClass="h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] px-3 text-[14px] text-[var(--text-primary)]"
                />
              </div>

              <DialogFooter className="mt-6 flex w-full items-center justify-end gap-4 space-x-0">
                <Button type="submit" className="h-10 min-w-[132px] rounded-[10px] bg-[var(--primary)] px-5 text-[13px] font-medium text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]" disabled={isSubmitting}>
                  {t("login.submit")}
                </Button>

              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
