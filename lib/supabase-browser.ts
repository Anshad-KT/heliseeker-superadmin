import { createBrowserClient } from '@supabase/ssr'
import type { TypedSupabaseClient } from '@/lib/types/supabase'
import { useMemo } from 'react'
import { SUPABASE_AUTH_COOKIE_NAME } from '@/lib/supabase-auth'

let client: TypedSupabaseClient | undefined

function getSupabaseBrowserClient() {
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (client) {
    return client
  }

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey!,
    {
      cookieOptions: {
        name: SUPABASE_AUTH_COOKIE_NAME,
      },
    }
  )

  return client
}

function useSupabaseBrowser() {
  return useMemo(getSupabaseBrowserClient, [])
}

export default useSupabaseBrowser
