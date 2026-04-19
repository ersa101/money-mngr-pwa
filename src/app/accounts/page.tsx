import { redirect } from 'next/navigation'

// Accounts management moved to Settings > Accounts tab
export default function AccountsPage() {
  redirect('/settings')
}
