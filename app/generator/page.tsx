import { redirect } from 'next/navigation'

// The generator now lives on the merged home hub.
export default function GeneratorPage() {
  redirect('/home')
}
