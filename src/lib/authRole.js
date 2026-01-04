import { supabase } from '@/lib/supabase'

export async function getUserRole() {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data?.session?.user?.id
    if (!uid) return 'normal'
    const { data: prof, error } = await supabase
      .from('user_access_profiles')
      .select('profile_type')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) return 'normal'
    const t = String(prof?.profile_type || 'normal').toLowerCase()
    return t === 'admin' ? 'admin' : 'normal'
  } catch {
    return 'normal'
  }
}

