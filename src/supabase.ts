import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lvmqrcwyibfgpaevwwzp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_A5hHfyat-Bl7Or4GjZpK6w_xlStXywA'

export const ALLOWED_EMAIL = 'raul.sousa.work@gmail.com'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
