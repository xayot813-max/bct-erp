"use client"

import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useForm } from 'react-hook-form'
import z from 'zod'
import { Form } from '../ui/form'
import CustomFormField, { FormFieldType } from '../shared/customFormField'
import { SelectItem } from '../ui/select'

export default function DealForm({ type, data = null, clientId = null }) {

  const ClientValidation = z.object({
    name: z.string().min(2, "Имя обязательно для заполнения").trim(),
    phone: z.string().min(9, "Некорректный номер телефона").trim(),
    email: z.string().email("Некорректный email адрес").trim(),
    orders: z.number().min(0, "Количество заказов не может быть отрицательным"),
  })

  // Form setup
  const form = useForm({
    resolver: zodResolver(ClientValidation),
    defaultValues: {
      name: data?.name || "",
      phone: data?.phone || "",
      email: data?.email || "",
      orders: data?.orders || 0,
    },
    mode: "onSubmit",
  })

  const onSubmit = async () => {
    try {

    } catch (error) {

    }
  }

  return (
    <div className='w-full col-span-3'>
      <Form className="" {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-col bg-white p-4 rounded-md gap-4">

            {/* MULTI SELECT (Клиенты) */}
            <CustomFormField
              fieldType={FormFieldType.MULTI_SELECT}
              control={form.control}
              name="clients"
              label="Клиенты"
              className="h-11"
              placeholder="Выберите клиентов"
              options={[
                { value: "client1", label: "Компания A" },
                { value: "client2", label: "Компания B" },
                { value: "client3", label: "Компания C" },
                { value: "client4", label: "Компания D" },
              ]}
            />

            {/* Компания */}
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="company"
              label="Компания"
              required
              placeholder="Введите название компании"
              inputClass={`text-black rounded-md border ${false ? 'bg-gray-50' : ''}`}
            />

            {/* Договор */}
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="agreement"
              label="Договор"
              required
              placeholder="Например: Договор №123"
              inputClass={`h-11 text-black rounded-md border ${false ? 'bg-gray-50' : ''}`}
            />

            {/* Счёт фактура */}
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="invoice"
              label="Счёт-фактура"
              required
              placeholder="Например: СФ-456"
              inputClass={`h-11 text-black rounded-md border ${false ? 'bg-gray-50' : ''}`}
            />

            {/* Гарантия */}
            <CustomFormField
              fieldType={FormFieldType.INPUT}
              control={form.control}
              name="guarantee"
              label="Гарантия"
              required
              placeholder="Например: 12 месяцев"
              inputClass={`h-11 text-black rounded-md border ${false ? 'bg-gray-50' : ''}`}
            />

            {/* Способ оплаты */}
            <CustomFormField
              fieldType={FormFieldType.SELECT}
              control={form.control}
              name="payment_method"
              label="Способ оплаты"
              required
              placeholder="Выберите способ оплаты"
              inputClass="w-full h-12 text-black rounded-md border"
            >
              <SelectItem value="card">💳 Банковская карта</SelectItem>
              <SelectItem value="cash">💵 Наличные</SelectItem>
              <SelectItem value="transfer">🏦 Банковский перевод</SelectItem>
              <SelectItem value="click">📱 Click</SelectItem>
              <SelectItem value="payme">💸 Payme</SelectItem>
            </CustomFormField>

            {/* Комментарий */}
            <CustomFormField
              fieldType={FormFieldType.TEXTAREA}
              control={form.control}
              name="comment"
              label="Комментарии"
              placeholder="Введите комментарий к сделке"
              inputClass={`h-24 text-black rounded-md border ${false ? 'bg-gray-50' : ''}`}
            />
          </div>
        </form>
      </Form>
    </div>
  )
}
