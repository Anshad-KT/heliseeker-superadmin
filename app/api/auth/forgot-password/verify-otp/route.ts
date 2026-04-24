import { NextResponse } from "next/server"
import { getServerSupabase } from "@/app/api/_lib/supabase"
import {
  assertValidForgotPasswordRecovery,
  clearForgotPasswordRecoveryCookie,
} from "../_lib/recovery-window"

type VerifyOtpBody = {
  email?: string
  otp?: string
}

const OTP_LENGTH = 6

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeOtp(otp: string) {
  return otp.replace(/\D/g, "").slice(0, OTP_LENGTH)
}

function mapVerifyOtpError(error: unknown) {
  if (error instanceof Error && /expired|invalid/i.test(error.message)) {
    return new Error("OTP has expired or is invalid. Use the latest 6-digit code sent to your email.")
  }
  return error
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyOtpBody
    const email = normalizeEmail(body.email ?? "")
    const otp = normalizeOtp(body.otp ?? "")

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    if (otp.length !== OTP_LENGTH) {
      return NextResponse.json({ error: "OTP must be exactly 6 digits." }, { status: 400 })
    }

    await assertValidForgotPasswordRecovery(email)

    const db = await getServerSupabase()
    const { data, error } = await db.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    })

    if (error) {
      const mapped = mapVerifyOtpError(new Error(error.message))
      return NextResponse.json(
        { error: mapped instanceof Error ? mapped.message : "Invalid OTP." },
        { status: 401 },
      )
    }

    if (!data.session || !data.user) {
      return NextResponse.json(
        { error: "OTP verification failed to create reset session." },
        { status: 401 },
      )
    }

    return NextResponse.json({ success: true, message: "OTP verified." })
  } catch (error) {
    if (error instanceof Error && /OTP has expired/i.test(error.message)) {
      await clearForgotPasswordRecoveryCookie()
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const message = mapVerifyOtpError(error)
    return NextResponse.json(
      { error: message instanceof Error ? message.message : "Unable to verify OTP." },
      { status: 500 },
    )
  }
}
