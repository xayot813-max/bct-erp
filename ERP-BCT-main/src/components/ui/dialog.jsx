"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const baseOverlay =
  "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

const placementOverlay = {
  center: "grid place-items-center p-2",         // markaz
  "top-center": "grid place-items-center p-2",   // alias
  "center-zoom": "grid place-items-center p-2",  // eski zoom markaz
  top: "flex items-start justify-center p-4",
  "top-left": "flex items-start justify-start p-4",
  "top-right": "flex items-start justify-end p-4",
  bottom: "flex items-end justify-center p-4",
  "bottom-left": "flex items-end justify-start p-4",
  "bottom-right": "flex items-end justify-end p-4",
  left: "flex items-center justify-start p-4",
  right: "flex items-center justify-end p-4",
};

// Animatsiyalar
const motionByPosition = {
  // center — tepadan markazga tushadi
  center:
    "data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
  // alias
  "top-center":
    "data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",

  // eski zoom markaz varianti
  "center-zoom":
    "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
  top:
    "data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top",
  "top-left":
    "data-[state=open]:slide-in-from-top-left data-[state=closed]:slide-out-to-top-left",
  "top-right":
    "data-[state=open]:slide-in-from-top-right data-[state=closed]:slide-out-to-top-right",
  bottom:
    "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
  "bottom-left":
    "data-[state=open]:slide-in-from-bottom-left data-[state=closed]:slide-out-to-bottom-left",
  "bottom-right":
    "data-[state=open]:slide-in-from-bottom-right data-[state=closed]:slide-out-to-bottom-right",
  left:
    "data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left",
  right:
    "data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
};

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(baseOverlay, className)}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef(
  (
    {
      position = "center", // default: tepadan markazga tushish
      className,
      children,
      handleClose,
      mark,
      ...props
    },
    ref
  ) => {
    const overlayClass = placementOverlay[position] ?? placementOverlay.center;
    const motionClass = motionByPosition[position] ?? motionByPosition.center;

    return (
      <DialogPortal>
        <DialogOverlay className={overlayClass}>
          <DialogPrimitive.Content
            ref={ref}
            className={cn(
              "relative z-50 grid gap-4 border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[var(--text-primary)] p-6 shadow-[var(--surface-shadow)] sm:rounded-2xl duration-200",
              "data-[state=open]:animate-in data-[state=closed]:animate-out",
              motionClass,
              className
            )}
            {...props}
          >
            {children}

            {mark === "false" ? (
              <DialogPrimitive.Close
                onClick={handleClose}
                className="sm:w-6 w-5 absolute left-2 top-2 rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
              >
                <div className="size-5 sm:size-6 rounded-full bg-red-500 group flex items-center justify-center">
                  <X className="h-3 w-3 text-secondary-foreground hidden group-hover:block" />
                </div>
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            ) : mark === "true" ? (
              <DialogPrimitive.Close
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            ) : null}
          </DialogPrimitive.Content>
        </DialogOverlay>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn(
      "pt-4 flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }) => (
  <div className={cn("space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
