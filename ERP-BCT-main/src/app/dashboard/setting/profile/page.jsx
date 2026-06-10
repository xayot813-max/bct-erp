"use client"

import { useEffect, useMemo, useState } from "react"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import Cookies from "js-cookie"
import { useTranslation } from "react-i18next"
import { LogOut } from "lucide-react"

import { useAuth } from "@/components/providers/AuthProvider"
import { adminService } from "@/lib/api-services"
import { toast } from "sonner"
import { toastError, toastLoading, toastSuccess } from "@/lib/toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PageShell, PageTitle } from "@/components/shared/PageShell"

const cookieOptions = {
  expires: 7,
  sameSite: "lax",
  path: "/",
}

const secureOption = typeof window !== "undefined" && window.location.protocol === "https:"

export default function AdminProfilePage() {
  const { t } = useTranslation()
  const { user, tokens, isAuthenticated, refreshFromCookies, clearAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [initialValues, setInitialValues] = useState({ name: "" })

  const ProfileSchema = useMemo(() => z.object({
    name: z.string().min(3, t("adminProfile.errors.name")),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
  }).superRefine((data, ctx) => {
    if (data.password && data.password.length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: t("adminProfile.errors.password"),
      })
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: t("adminProfile.errors.passwordMatch"),
      })
    }
  }), [t])

  const form = useForm({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!tokens.accessToken) return
      try {
        setIsLoading(true)
        const profile = await adminService.profile(tokens.accessToken)
        setInitialValues({ name: profile?.name || "" })
        form.reset({ name: profile?.name || "", password: "", confirmPassword: "" })
      } catch (error) {
        console.error("Failed to fetch admin profile:", error)
        toastError({
          title: t("adminProfile.loadErrorTitle"),
          description: error.message || t("adminProfile.loadErrorDescription"),
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (isAuthenticated) {
      loadProfile()
    }
  }, [isAuthenticated, tokens.accessToken, form, t])

  const handleSubmit = async (values) => {
    if (!tokens.accessToken) {
      toastError({
        title: t("adminProfile.authRequiredTitle"),
        description: t("adminProfile.authRequiredDescription"),
      })
      return
    }

    const loadingId = toastLoading({
      title: t("adminProfile.updatingTitle"),
      description: t("adminProfile.updatingDescription"),
    })

    try {
      const result = await adminService.update(
        {
          name: values.name.trim(),
          ...(values.password ? { password: values.password } : {}),
        },
        tokens.accessToken,
      )

      Cookies.set("authData", JSON.stringify(result.admin), {
        ...cookieOptions,
        secure: secureOption,
      })
      Cookies.set("accessToken", result.token, {
        ...cookieOptions,
        secure: secureOption,
      })

      refreshFromCookies()
      toastSuccess({
        title: t("adminProfile.successTitle"),
        description: t("adminProfile.successDescription"),
      })
      form.reset({ name: result.admin.name, password: "", confirmPassword: "" })
      setInitialValues({ name: result.admin.name })
    } catch (error) {
      console.error("Failed to update admin credentials:", error)
      toastError({
        title: t("adminProfile.errorTitle"),
        description: error.message || t("adminProfile.errorDescription"),
      })
    } finally {
      toast.dismiss(loadingId)
    }
  }

  if (!isAuthenticated) {
    return (
      <PageShell className="space-y-8">
        <PageTitle>{t("adminProfile.title")}</PageTitle>
        <Card>
          <CardHeader>
            <CardTitle>{t("adminProfile.loginRequiredTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("adminProfile.loginRequiredDescription")}
          </CardContent>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle>{t("adminProfile.title")}</PageTitle>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            {t("adminProfile.currentAdmin", { name: user?.name || initialValues.name || "admin", defaultValue: "Текущий администратор: {{name}}" })}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={clearAuth}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("header.dashboard.logout", { defaultValue: "Выйти" })}
        </Button>
      </div>
      <Card className="max-w-3xl border-[var(--border-default)] bg-[var(--surface)] shadow-[var(--surface-shadow)]">
        <CardHeader>
          <CardTitle>{t("adminProfile.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("adminProfile.fields.login")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("adminProfile.placeholders.login")} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("adminProfile.fields.password")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          placeholder={t("adminProfile.placeholders.passwordOptional", { defaultValue: "Оставьте пустым, если пароль менять не нужно" })}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("adminProfile.fields.confirmPassword")}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          {...field}
                          placeholder={t("adminProfile.placeholders.confirmPasswordOptional", { defaultValue: "Повторите новый пароль" })}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => form.reset({ ...initialValues, password: "", confirmPassword: "" })}
                >
                  {t("adminProfile.actions.reset")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {t("adminProfile.actions.save")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </PageShell>
  )
}
