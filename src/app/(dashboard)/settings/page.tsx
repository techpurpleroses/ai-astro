import { SettingsClient } from '@/components/settings/settings-page'
import { getServerSupabaseClient } from '@/lib/supabase/server'
import { BillingService } from '@/server/foundation/modules/billing/service'
import { getServiceRoleSupabaseClient } from '@/server/integrations/supabase/service-role-client'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await getServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch subscription state server-side — accurate across all devices
  let activePlanCode: string = 'free'
  let creditBalance: number = 0
  if (user) {
    try {
      const db = getServiceRoleSupabaseClient()
      const billing = new BillingService(db)
      const [sub, credits] = await Promise.all([
        billing.getActiveSubscription(user.id),
        billing.getCreditBalance(user.id),
      ])
      if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
        activePlanCode = sub.planCode
      }
      creditBalance = credits.balance
    } catch {
      // Non-fatal: fall back to free
    }
  }

  return (
    <SettingsClient
      userEmail={user?.email ?? null}
      activePlanCode={activePlanCode}
      creditBalance={creditBalance}
    />
  )
}
