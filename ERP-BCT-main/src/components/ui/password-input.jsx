"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeClosed, EyeOff } from "lucide-react";
// import { useTranslations } from "next-intl";

const PasswordInput = React.forwardRef(({ className, ...props }, ref) => {
  // const t = useTranslations("Register");
  const [showPassword, setShowPassword] = React.useState(false);
  const disabled =
    props.value === "" || props.value === undefined || props.disabled;

  const handleChange = (event) => {
    const inputValue = event.target.value;
    // Faqat raqam va musbat qiymatlar qabul qilish
      props.onChange(event); // Faqat valid qiymatni qaytarish
  };

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        className={cn("hide-password-toggle pr-10", className)}
        ref={ref}
        {...props}
        onChange={handleChange} // Custom onChange ishlatish
      />
      <Button
        aria-label={`password input`}
        type="button"
        variant="ghost"
        size="sm"
        className="max-sm:hidden absolute -right-3 -top-9  h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShowPassword((prev) => !prev)}
        disabled={disabled}
      >
        {showPassword && !disabled ? (
          <Eye
            className={`${showPassword ? "text-[#ABAFB1]" : "text-[#ABAFB1]"}`}
            size={32}
          />
        ) : (
          <EyeOff
            size={32}
            className={`${showPassword ? "text-[#ABAFB1]" : "text-[#ABAFB1]"}`}
          />
        )}
        <h1
          className={`textSmall2 ${
            showPassword ? "text-[#ABAFB1]" : "text-[#bdc5c9]"
          }`}
        >
          {/* {t("password")} */}
          Password
        </h1>
        <span className="sr-only">
          {showPassword ? "Hide password" : "Show password"}
        </span>
      </Button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
