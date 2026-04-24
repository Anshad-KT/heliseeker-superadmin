import { NextResponse } from "next/server"
import { getServerSupabase } from "@/app/api/_lib/supabase"
import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"
import { setForgotPasswordRecoveryCookie } from "../_lib/recovery-window"

type SendOtpBody = {
  email?: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpBody
    const email = normalizeEmail(body.email ?? "")

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    const db = await getServerSupabase()
    const canUseAdmin =
      Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)

    try {
      const lookupDb = canUseAdmin ? getServiceRoleSupabase() : db
      const { data: adminRow, error: adminError } = await lookupDb
        .from("admins")
        .select("admin_id,is_active")
        .eq("email", email)
        .limit(1)
        .maybeSingle()

      if (adminError) {
        if (canUseAdmin) {
          return NextResponse.json({ error: adminError.message }, { status: 400 })
        }
      } else if (!adminRow || !adminRow.is_active) {
        return NextResponse.json({ error: "Email not found." }, { status: 400 })
      }
    } catch {
      // Fall back to the auth OTP send attempt when admin lookup is unavailable.
    }

    const { error } = await db.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await setForgotPasswordRecoveryCookie(email)

    return NextResponse.json({ success: true, message: "Verification code sent." })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
