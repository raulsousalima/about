import { createClient } from '@supabase/supabase-js'

// Public project URL + publishable key. These are safe to ship in the client:
// Row Level Security is what actually protects writes (only the owner's
// authenticated session can change case_flags). Reads are intentionally public.
const SUPABASE_URL = 'https://lvmqrcwyibfgpaevwwzp.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_A5hHfyat-Bl7Or4GjZpK6w_xlStXywA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // completes the magic-link redirect automatically
  },
})

export const ADMIN_EMAIL = 'raul.sousa.work@gmail.com'
