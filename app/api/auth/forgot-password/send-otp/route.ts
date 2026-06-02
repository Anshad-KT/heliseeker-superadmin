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

function isForgotPasswordLogOnlyMode() {
  return process.env.FORGOT_PASSWORD_LOG_ONLY === "true"
}

function shouldLogForgotPasswordEmail() {
  return process.env.FORGOT_PASSWORD_LOG_EMAIL === "true"
}

function getAppBaseUrl(request: Request) {
  const configured =
    process.env.NEXT_PUBLIC_SUPERADMIN_URL ||
    process.env.SUPERADMIN_APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL

  if (configured) {
    return configured.replace(/\/$/, "")
  }

  return new URL(request.url).origin
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendOtpBody
    const email = normalizeEmail(body.email ?? "")

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 })
    }

    if (shouldLogForgotPasswordEmail()) {
      console.info(`[FORGOT_PASSWORD_EMAIL_LOG] requested_email=${email}`)
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

    if (isForgotPasswordLogOnlyMode()) {
      if (!canUseAdmin) {
        return NextResponse.json(
          {
            error:
              "FORGOT_PASSWORD_LOG_ONLY requires SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY).",
          },
          { status: 500 },
        )
      }

      const adminDb = getServiceRoleSupabase()
      const appBaseUrl = getAppBaseUrl(request)
      const { data: linkData, error } = await adminDb.auth.admin.generateLink({
        type: "recovery",
        email,
        options: {
          redirectTo: `${appBaseUrl}/forgot-password/reset`,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      const otp = linkData?.properties?.email_otp ?? "N/A"
      const actionLink = linkData?.properties?.action_link ?? "N/A"
      const hashedToken = linkData?.properties?.hashed_token ?? ""
      const verificationType = linkData?.properties?.verification_type ?? "recovery"
      const resetPasswordLink = hashedToken
        ? `${appBaseUrl}/api/auth/forgot-password/dev-reset-link?token_hash=${encodeURIComponent(hashedToken)}&email=${encodeURIComponent(email)}`
        : "N/A"

      console.info(
        `[FORGOT_PASSWORD_LOG_ONLY] email=${email} type=${verificationType} otp=${otp} action_link=${actionLink}`,
      )
      console.info(`[FORGOT_PASSWORD_RESET_LINK_LOG] ${resetPasswordLink}`)
    } else {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    await setForgotPasswordRecoveryCookie(email)

    return NextResponse.json({
      success: true,
      message: isForgotPasswordLogOnlyMode()
        ? "Verification code generated. Check server logs."
        : "Verification code sent.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send OTP."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
