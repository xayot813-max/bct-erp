"use client"

import React from 'react'
import { useTranslation } from "react-i18next"
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Eye, EyeOff, Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import PhoneInput from "react-phone-number-input"
import "react-phone-number-input/style.css"

export const FormFieldType = {
  INPUT: "input",
  NUMBER: "number",
  TEXTAREA: "textarea",
  PHONE_INPUT: "phoneInput",
  PASSWORDINPUT: "passwordInput",
  CHECKBOX: "checkbox",
  DATE_PICKER: "datePicker",
  SELECT: "select",
  MULTI_SELECT: "multiSelect",
  SKELETON: "skeleton",
  RADIO: "radio",
  CURRENCY: "currency",
}

const MultiSelectField = ({ field, props }) => {
  const { t } = useTranslation("common")
  const [open, setOpen] = React.useState(false)
  const selectedValues = field.value || []

  const toggleOption = (optionValue) => {
    const currentValues = selectedValues || []
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue]

    field.onChange(newValues)
  }

  const removeValue = (valueToRemove) => {
    const newValues = selectedValues.filter(v => v !== valueToRemove)
    field.onChange(newValues)
  }

  const getSelectedLabels = () => {
    if (!props.options || !selectedValues) return []
    return props.options
      .filter(option => selectedValues.includes(option.value))
      .map(option => option.label)
  }

  return (
    <div className="space-y-2">
      {/* Selected values as badges */}
      {selectedValues && selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedLabels().map((label, index) => (
            <Badge key={index} variant="outline" className="text-xs h-8">
              {label}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto p-0 ml-1 hover:bg-transparent text-primary"
                onClick={() => {
                  const valueToRemove = props.options.find(opt => opt.label === label)?.value
                  if (valueToRemove) removeValue(valueToRemove)
                }}
                disabled={props.disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <Popover className="w-full" open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="w-full" asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              props.className,
              props.disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={props.disabled}
          >
            {selectedValues && selectedValues.length > 0
              ? t("common.selectedCount", { count: selectedValues.length, defaultValue: "{{count}} selected" })
              : props.placeholder || t("common.selectOptions", { defaultValue: "Select options..." })}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command className={"w-full"}>
            <CommandInput placeholder={t("table.searchPlaceholder", { defaultValue: "Search..." })} />
            <CommandEmpty>{t("table.nothingFound", { defaultValue: "Nothing found" })}</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {props.options?.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggleOption(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

const RenderInput = ({ field, className, props, rules }) => {
  const [showPassword, setShowPassword] = React.useState(false)

  switch (props.fieldType) {
    case FormFieldType.INPUT:
      return (
        <FormControl>
          <Input
            placeholder={props.placeholder}
            {...field}
            value={field.value || ""}
            className={cn(
              "textBig focus:border-white/50",
              props.className,
              className
            )}
            disabled={props.disabled}
          />
        </FormControl>
      )

    case FormFieldType.NUMBER:
      return (
        <FormControl>
          <Input
            type="number"
            step={props.step ?? "any"}
            inputMode={props.inputMode ?? "decimal"}
            placeholder={props.placeholder}
            {...field}
            value={field.value || ""}
            className={cn(
              "textBig focus:border-white/50",
              props.className,
              className
            )}
            disabled={props.disabled}
          />
        </FormControl>
      )

    case FormFieldType.PASSWORDINPUT:
      return (
        <FormControl>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={props.placeholder}
              {...field}
              value={field.value || ""}
              className={cn(
                "textBig focus:border-white/50 pr-10",
                props.className,
                className
              )}
              disabled={props.disabled}
              onChange={(e) => {
                const value = e.target.value
                if (props.numbersOnly) {
                  if (/^\d*$/.test(value)) {
                    field.onChange(value)
                  }
                } else {
                  field.onChange(value)
                }
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
              disabled={props.disabled}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </FormControl>
      )

    case FormFieldType.TEXTAREA:
      return (
        <FormControl>
          <Textarea
            placeholder={props.placeholder}
            {...field}
            value={field.value || ""}
            className={cn(
              "shad-textArea focus:border-white/50",
              props.className,
              className
            )}
            disabled={props.disabled}
            rows={props.rows || 3}
          />
        </FormControl>
      )

    case FormFieldType.DATE_PICKER:
      return (
        <FormControl>
          <Input
            type="date"
            {...field}
            value={field.value || ""}
            className={cn(
              "textBig focus:border-white/50",
              props.className,
              className
            )}
            disabled={props.disabled}
          />
        </FormControl>
      )

    case FormFieldType.SELECT:
      return (
        <FormControl>
          <Select
            value={field.value || ""}
            onValueChange={field.onChange}
            disabled={props.disabled}
          >
            <FormControl>
              <SelectTrigger
                className={cn(
                  "h-11 rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-elevated)] text-[14px] text-[var(--text-primary)] shadow-sm",
                  props.className,
                  className
                )}
              >
                <SelectValue placeholder={props.placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent className={cn("shad-select-content z-[99999]")}>
              {props.children}
            </SelectContent>
          </Select>
        </FormControl>
      )

    case FormFieldType.MULTI_SELECT:
      return (
        <FormControl>
          <MultiSelectField field={field} props={props} />
        </FormControl>
      )

    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl>
          <PhoneInput
            defaultCountry="UZ"
            placeholder={props.placeholder}
            international
            withCountryCallingCode
            value={field.value || ""}
            onChange={field.onChange}
            className={cn("input-phone rounded-md", props.className, className)}
            style={{ borderColor: "transparent" }}
            countryCallingCodeEditable={false}
            focusInputOnCountrySelection
            disabled={props.disabled}
          />
        </FormControl>
      )

    case FormFieldType.CHECKBOX:
      return (
        <FormControl>
          <div className="flex items-center space-x-2">
            <Checkbox
              id={props.name}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={props.disabled}
            />
            <Label
              htmlFor={props.name}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {props.label}
            </Label>
          </div>
        </FormControl>
      )

    case FormFieldType.RADIO:
      return (
        <FormControl>
          <RadioGroup
            onValueChange={field.onChange}
            defaultValue={field.value}
            className="flex flex-col space-y-1"
            disabled={props.disabled}
          >
            {props.options?.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value}>{option.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </FormControl>
      )

    case FormFieldType.SKELETON:
      return props.renderSkeleton ? props.renderSkeleton(field) : null

    default:
      return null
  }
}

const CustomFormField = (props) => {
  const { control, name, label, inputClass, optional, labelClass, required } = props

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1 flex flex-col">
          {props.fieldType !== FormFieldType.CHECKBOX && label && (
            <FormLabel className={cn("text-[13px] font-medium text-[var(--text-primary)]", labelClass)}>
              {label}
              {required && (
                <span className="text-red-500 mr-1">*</span>
              )}
              {optional && (
                <span className="ml-1 text-[12px] text-[var(--text-secondary)]">({optional})</span>
              )}
            </FormLabel>
          )}
          <RenderInput
            className={cn(
              "bg-transparent text-sm",
              inputClass
            )}
            field={field}
            props={props}
          />
          <FormMessage className="shad-error" />
        </FormItem>
      )}
    />
  )
}

export default CustomFormField

// <Form {...form}>
//   <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

//     {/* INPUT */}
//     <CustomFormField
//       fieldType={FormFieldType.INPUT}
//       control={form.control}
//       name="name"
//       label="Ism"
//       placeholder="Ismingizni kiriting"
//       required
//     />

//     {/* NUMBER */}
//     <CustomFormField
//       fieldType={FormFieldType.NUMBER}
//       control={form.control}
//       name="age"
//       label="Yosh"
//       placeholder="Yoshingizni kiriting"
//     />

//     {/* PASSWORD */}
//     <CustomFormField
//       fieldType={FormFieldType.PASSWORDINPUT}
//       control={form.control}
//       name="password"
//       label="Parol"
//       placeholder="Parolni kiriting"
//       required
//     />

//     {/* TEXTAREA */}
//     <CustomFormField
//       fieldType={FormFieldType.TEXTAREA}
//       control={form.control}
//       name="bio"
//       label="Biografiya"
//       placeholder="O'zingiz haqingizda qisqa yozing"
//       rows={4}
//     />

//     {/* PHONE INPUT */}
//     <CustomFormField
//       fieldType={FormFieldType.PHONE_INPUT}
//       control={form.control}
//       name="phone"
//       label="Telefon raqam"
//       placeholder="+998 ** *** ** **"
//     />

//     {/* CHECKBOX */}
//     <CustomFormField
//       fieldType={FormFieldType.CHECKBOX}
//       control={form.control}
//       name="agree"
//       label="Shartlarga roziman"
//     />

//     {/* DATE PICKER */}
//     <CustomFormField
//       fieldType={FormFieldType.DATE_PICKER}
//       control={form.control}
//       name="birth_date"
//       label="Tug‘ilgan sana"
//     />

//     {/* SELECT */}
//     <CustomFormField
//       fieldType={FormFieldType.SELECT}
//       control={form.control}
//       name="payment_method"
//       label="To‘lov usuli"
//       placeholder="Tanlang..."
//     >
//       <SelectItem value="card">💳 Karta</SelectItem>
//       <SelectItem value="cash">💵 Naqd</SelectItem>
//       <SelectItem value="click">📱 Click</SelectItem>
//       <SelectItem value="payme">💸 Payme</SelectItem>
//     </CustomFormField>

//     {/* MULTI SELECT */}
//     <CustomFormField
//       fieldType={FormFieldType.MULTI_SELECT}
//       control={form.control}
//       name="hobbies"
//       label="Qiziqishlar"
//       placeholder="Bir nechta tanlang..."
//       options={[
//         { value: "coding", label: "👨‍💻 Dasturlash" },
//         { value: "music", label: "🎵 Musiqa" },
//         { value: "sport", label: "⚽ Sport" },
//         { value: "reading", label: "📚 Kitob o‘qish" },
//       ]}
//     />

//     {/* RADIO */}
//     <CustomFormField
//       fieldType={FormFieldType.RADIO}
//       control={form.control}
//       name="gender"
//       label="Jins"
//       options={[
//         { value: "male", label: "👨 Erkak" },
//         { value: "female", label: "👩 Ayol" },
//       ]}
//     />

//     <Button type="submit" className="mt-4">Yuborish</Button>
//   </form>
// </Form>
