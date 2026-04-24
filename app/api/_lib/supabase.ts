// export async function getServerSupabase() {
//   const cookieStore = await cookies();
//   return createRouteHandlerClient({ cookies: async () => cookieStore });
// }


import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_AUTH_COOKIE_NAME } from '@/lib/supabase-auth'

export async function getServerSupabase() {
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_KEY
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey!,
    {
      cookieOptions: {
        name: SUPABASE_AUTH_COOKIE_NAME,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
