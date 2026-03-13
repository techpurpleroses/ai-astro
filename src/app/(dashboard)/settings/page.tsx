import { SettingsClient } from '@/components/settings/settings-page'
import { getServerSupabaseClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await getServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <SettingsClient userEmail={user?.email ?? null} />
}
