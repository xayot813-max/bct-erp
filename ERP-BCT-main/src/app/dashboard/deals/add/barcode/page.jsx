import BarcodeProductSelector from "@/components/deals/BarcodeProductSelector"

export default function DealBarcodePage({ searchParams }) {
  const awaited = searchParams || {}
  return <BarcodeProductSelector returnTo={awaited?.returnTo} />
}
