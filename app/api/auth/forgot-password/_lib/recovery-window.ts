import { cookies } from "next/headers"

const RECOVERY_COOKIE_NAME = "hs_superadmin_forgot_password_recovery"
const OTP_MAX_AGE_MS = 45 * 1000

type RecoveryCookiePayload = {
  email: string
  sentAt: number
}

function parseRecoveryCookie(value: string | undefined): RecoveryCookiePayload | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<RecoveryCookiePayload>
    if (typeof parsed.email !== "string" || typeof parsed.sentAt !== "number") {
      return null
    }

    if (!Number.isFinite(parsed.sentAt)) {
      return null
    }

    return {
      email: parsed.email.trim().toLowerCase(),
      sentAt: parsed.sentAt,
    }
  } catch {
    return null
  }
}

function isRecoveryExpired(sentAt: number, now = Date.now()) {
  return now - sentAt > OTP_MAX_AGE_MS
}

export async function setForgotPasswordRecoveryCookie(email: string, sentAt = Date.now()) {
  const cookieStore = await cookies()
  cookieStore.set(RECOVERY_COOKIE_NAME, JSON.stringify({ email, sentAt }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(OTP_MAX_AGE_MS / 1000),
  })
}

export async function clearForgotPasswordRecoveryCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(RECOVERY_COOKIE_NAME)
}

export async function assertValidForgotPasswordRecovery(email: string) {
  const cookieStore = await cookies()
  const recovery = parseRecoveryCookie(cookieStore.get(RECOVERY_COOKIE_NAME)?.value)
  const normalizedEmail = email.trim().toLowerCase()

  if (!recovery || recovery.email !== normalizedEmail) {
    throw new Error("OTP has expired. Please request a new code.")
  }

  if (isRecoveryExpired(recovery.sentAt)) {
    cookieStore.delete(RECOVERY_COOKIE_NAME)
    throw new Error("OTP has expired. Please request a new code.")
  }

  return recovery
}

export { OTP_MAX_AGE_MS }
