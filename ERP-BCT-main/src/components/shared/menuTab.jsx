
"use client"
import Link from 'next/link'
import React from 'react'

export default function MenuTab({ menu }) {
  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {menu?.map((m, i) => {
        return (
          <Link key={i} href={m?.link ? m?.link : ""} className="block w-full">
            <div className="flex min-h-[128px] w-full flex-col justify-center rounded-[12px] bg-[#2B2F3A] px-5 py-5 text-white shadow-[0_8px_20px_rgba(25,28,38,0.06)] transition hover:-translate-y-0.5 hover:bg-[#333744]">
              <h1 className='text-[19px] font-medium leading-tight text-white'>{m?.title}</h1>
              <p className='mt-2 line-clamp-2 text-[14px] leading-[1.35] text-white/72'>{m?.desc}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
