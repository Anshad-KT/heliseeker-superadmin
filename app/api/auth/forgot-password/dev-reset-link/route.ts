import { NextResponse } from "next/server"
import { getServerSupabase } from "@/app/api/_lib/supabase"
import { setForgotPasswordRecoveryCookie } from "../_lib/recovery-window"

function isEnabled() {
  return process.env.FORGOT_PASSWORD_LOG_ONLY === "true"
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function GET(request: Request) {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const url = new URL(request.url)
  const tokenHash = url.searchParams.get("token_hash")?.trim() ?? ""
  const rawEmail = url.searchParams.get("email")?.trim() ?? ""
  const email = rawEmail ? normalizeEmail(rawEmail) : ""

  if (!tokenHash) {
    return NextResponse.json({ error: "Missing token_hash." }, { status: 400 })
  }

  const db = await getServerSupabase()
  const { data, error } = await db.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  if (!data.session || !data.user) {
    return NextResponse.json(
      { error: "Recovery verification failed to create reset session." },
      { status: 401 },
    )
  }

  if (email) {
    await setForgotPasswordRecoveryCookie(email)
  }

  const redirectTo = `${url.origin}/forgot-password/reset`
  return NextResponse.redirect(redirectTo)
}
