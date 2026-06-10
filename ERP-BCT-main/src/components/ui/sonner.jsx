"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="top-center"   // qaysi tomonga biriktirish
      offset={80}           // ✅ top: 100px bo‘ladi
      toastOptions={{
        classNames: {
          toast: "rounded-2xl shadow-lg",
        },
      }}
    />
  );
}
