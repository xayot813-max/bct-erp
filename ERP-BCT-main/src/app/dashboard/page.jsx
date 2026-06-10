import React from 'react'
import MenuComponent from './_components/MenuComponent'
import { ChartAreaInteractive } from './_components/StatisticsComponent'
export default function HomePage() {
  return (
    <div className='flex flex-col gap-5'>
      <MenuComponent />
      <ChartAreaInteractive />
    </div>
  )
}
