"use client"

export default function ScreenSizeGate({ children }) {
  return (
    <div className="min-h-screen overflow-x-auto overflow-y-visible">
      <div className="min-h-screen min-w-[1180px]">
        {children}
      </div>
    </div>
  )
}
