const FORGOT_PASSWORD_EMAIL_KEY = "forgot_password_email"
const FORGOT_PASSWORD_OTP_SENT_AT_KEY = "forgot_password_otp_sent_at"
const FORGOT_PASSWORD_RECOVERY_EVENT = "forgot-password:recovery"
const OTP_LENGTH = 6

function notifyRecoveryStoreChange() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(FORGOT_PASSWORD_RECOVERY_EVENT))
}

export function subscribeRecoveryStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const onStorage = (event: StorageEvent) => {
    if (event.storageArea !== localStorage) return
    if (
      event.key !== FORGOT_PASSWORD_EMAIL_KEY &&
      event.key !== FORGOT_PASSWORD_OTP_SENT_AT_KEY
    ) {
      return
    }
    onStoreChange()
  }

  window.addEventListener("storage", onStorage)
  window.addEventListener(FORGOT_PASSWORD_RECOVERY_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(FORGOT_PASSWORD_RECOVERY_EVENT, onStoreChange)
  }
}

export function maskRecoveryEmail(email: string) {
  if (!email.includes("@")) {
    return email
  }

  const [name, domain] = email.split("@")
  if (name.length <= 2) {
    return `${name[0] ?? ""}***@${domain}`
  }

  return `${name.slice(0, 2)}***@${domain}`
}

export function getRecoveryEmail() {
  return localStorage.getItem(FORGOT_PASSWORD_EMAIL_KEY) ?? ""
}

export function setRecoveryEmail(email: string) {
  localStorage.setItem(FORGOT_PASSWORD_EMAIL_KEY, normalizeRecoveryEmail(email))
  notifyRecoveryStoreChange()
}

export function clearRecoveryEmail() {
  localStorage.removeItem(FORGOT_PASSWORD_EMAIL_KEY)
  notifyRecoveryStoreChange()
}

export function normalizeRecoveryEmail(email: string) {
  return email.trim().toLowerCase()
}

export function getRecoveryOtpSentAt() {
  const value = localStorage.getItem(FORGOT_PASSWORD_OTP_SENT_AT_KEY)
  if (!value) return 0
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function setRecoveryOtpSentAt(timestampMs = Date.now()) {
  localStorage.setItem(FORGOT_PASSWORD_OTP_SENT_AT_KEY, String(timestampMs))
  notifyRecoveryStoreChange()
}

export function clearRecoveryOtpSentAt() {
  localStorage.removeItem(FORGOT_PASSWORD_OTP_SENT_AT_KEY)
  notifyRecoveryStoreChange()
}

export function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_LENGTH)
}

export function isValidOtp(value: string) {
  return normalizeOtp(value).length === OTP_LENGTH
}
