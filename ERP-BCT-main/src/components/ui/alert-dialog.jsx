"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function AlertDialog({
  ...props
}) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />;
}

function AlertDialogTrigger({
  ...props
}) {
  return (<AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />);
}

function AlertDialogPortal({
  ...props
}) {
  return (<AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />);
}

/**
 * @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>} [props]
 */
function AlertDialogOverlay({
  className,
  ...props
} = {}) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props} />
  );
}

/**
 * @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>} [props]
 */
function AlertDialogContent({
  className,
  ...props
} = {}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          "bg-[var(--surface-elevated)] text-[var(--text-primary)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border border-[var(--border-default)] p-6 shadow-[var(--surface-shadow)] duration-200 sm:max-w-lg",
          className
        )}
        {...props} />
    </AlertDialogPortal>
  );
}

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} [props]
 */
function AlertDialogHeader({
  className,
  ...props
} = {}) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props} />
  );
}

/**
 * @param {React.HTMLAttributes<HTMLDivElement>} [props]
 */
function AlertDialogFooter({
  className,
  ...props
} = {}) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props} />
  );
}

/**
 * @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>} [props]
 */
function AlertDialogTitle({
  className,
  ...props
} = {}) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-lg font-semibold", className)}
      {...props} />
  );
}

/**
 * @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>} [props]
 */
function AlertDialogDescription({
  className,
  ...props
} = {}) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props} />
  );
}

/**
 * @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>} [props]
 */
function AlertDialogAction({
  className,
  ...props
} = {}) {
  return (<AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />);
}

/**
 * @param {React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>} [props]
 */
function AlertDialogCancel({
  className,
  ...props
} = {}) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props} />
  );
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
