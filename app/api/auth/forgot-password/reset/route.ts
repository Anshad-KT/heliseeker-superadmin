import { NextResponse } from "next/server"
import { getServerSupabase } from "@/app/api/_lib/supabase"
import {
  assertValidForgotPasswordRecovery,
  clearForgotPasswordRecoveryCookie,
} from "../_lib/recovery-window"

type ResetPasswordBody = {
  password?: string
}

function validatePassword(password: string) {
  return password.length >= 8
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResetPasswordBody
    const password = body.password ?? ""

    if (!password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 })
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 },
      )
    }

    const db = await getServerSupabase()
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser()

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json(
        { error: "Reset session expired. Please request a new code." },
        { status: 401 },
      )
    }

    await assertValidForgotPasswordRecovery(user.email ?? "")

    const { error } = await db.auth.updateUser({
      password,
      data: { must_change_password: false },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await db.auth.signOut()
    await clearForgotPasswordRecoveryCookie()

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Please log in with your new password.",
    })
  } catch (error) {
    if (error instanceof Error && /OTP has expired/i.test(error.message)) {
      await clearForgotPasswordRecoveryCookie()
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    const message = error instanceof Error ? error.message : "Unable to reset password."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
