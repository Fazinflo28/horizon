import { redirect } from 'next/navigation'

// The shop is now a section on the merged home hub.
export default function ShopPage() {
  redirect('/home#shop')
}
