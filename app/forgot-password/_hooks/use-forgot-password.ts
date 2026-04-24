"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import type {
  ForgotPasswordEmailInput,
  ForgotPasswordOtpInput,
  ForgotPasswordResetInput,
} from "../_types"
import {
  clearRecoveryEmail,
  clearRecoveryOtpSentAt,
  getRecoveryEmail,
  getRecoveryOtpSentAt,
  isValidOtp,
  normalizeOtp,
  normalizeRecoveryEmail,
  setRecoveryEmail,
  setRecoveryOtpSentAt,
} from "../_utils"

const FORGOT_PASSWORD_OTP_MAX_AGE_MS = 10 * 60 * 1000

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { error?: string; message?: string }
    return payload.error ?? payload.message ?? "Request failed"
  } catch {
    return "Request failed"
  }
}

export function useForgotPassword() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isResendingOtp, setIsResendingOtp] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)

  const submitEmail = useCallback(
    async (values: ForgotPasswordEmailInput) => {
      if (isSendingOtp) return
      setIsSendingOtp(true)

      try {
        const email = normalizeRecoveryEmail(values.email)
        const response = await fetch("/api/auth/forgot-password/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        })

        if (!response.ok) {
          throw new Error(await readErrorMessage(response))
        }

        setRecoveryEmail(email)
        setRecoveryOtpSentAt()
        toast({
          title: "Verification code sent",
          description: "Check your email for the 6-digit OTP.",
          variant: "success",
        })
        router.push("/forgot-password/otp")
      } catch (error) {
        toast({
          title: "Unable to send code",
          description: error instanceof Error ? error.message : "Failed to send OTP. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsSendingOtp(false)
      }
    },
    [isSendingOtp, router, toast],
  )

  const resendOtp = useCallback(async () => {
    if (isResendingOtp) return

    const email = getRecoveryEmail()
    if (!email) {
      toast({
        title: "Email is missing",
        description: "Please start the forgot password flow again.",
        variant: "destructive",
      })
      router.push("/forgot-password")
      return
    }

    setIsResendingOtp(true)
    try {
      const response = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error(await readErrorMessage(response))
      }

      setRecoveryOtpSentAt()
      toast({
        title: "Verification code resent",
        description: "Use the latest OTP from your email.",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Unable to resend code",
        description: error instanceof Error ? error.message : "Failed to resend OTP. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResendingOtp(false)
    }
  }, [isResendingOtp, router, toast])

  const submitOtp = useCallback(
    async (values: ForgotPasswordOtpInput) => {
      if (isVerifyingOtp) return

      const email = getRecoveryEmail()
      const otp = normalizeOtp(values.otp)

      if (!email) {
        toast({
          title: "Email is missing",
          description: "Please start the forgot password flow again.",
          variant: "destructive",
        })
        router.push("/forgot-password")
        return
      }

      const otpSentAt = getRecoveryOtpSentAt()
      if (!otpSentAt || Date.now() - otpSentAt > FORGOT_PASSWORD_OTP_MAX_AGE_MS) {
        clearRecoveryOtpSentAt()
        toast({
          title: "OTP expired",
          description: "Please request a new code.",
          variant: "destructive",
        })
        router.push("/forgot-password")
        return
      }

      if (!isValidOtp(otp)) {
        toast({
          title: "Invalid OTP",
          description: "Enter the 6-digit OTP from your email.",
          variant: "destructive",
        })
        return
      }

      setIsVerifyingOtp(true)
      try {
        const response = await fetch("/api/auth/forgot-password/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        })

        if (!response.ok) {
          throw new Error(await readErrorMessage(response))
        }

        toast({
          title: "OTP verified",
          description: "Set your new password.",
          variant: "success",
        })
        router.push("/forgot-password/reset")
      } catch (error) {
        toast({
          title: "OTP verification failed",
          description: error instanceof Error ? error.message : "Invalid OTP. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsVerifyingOtp(false)
      }
    },
    [isVerifyingOtp, router, toast],
  )

  const submitReset = useCallback(
    async (values: ForgotPasswordResetInput) => {
      if (isResettingPassword) return
      setIsResettingPassword(true)

      try {
        const response = await fetch("/api/auth/forgot-password/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: values.password }),
        })

        if (!response.ok) {
          throw new Error(await readErrorMessage(response))
        }

        clearRecoveryEmail()
        clearRecoveryOtpSentAt()
        toast({
          title: "Password updated",
          description: "Sign in with your new password.",
          variant: "success",
        })
        router.push("/login")
        router.refresh()
      } catch (error) {
        toast({
          title: "Unable to reset password",
          description:
            error instanceof Error ? error.message : "Failed to reset password. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsResettingPassword(false)
      }
    },
    [isResettingPassword, router, toast],
  )

  return {
    submitEmail,
    resendOtp,
    submitOtp,
    submitReset,
    isSendingOtp,
    isResendingOtp,
    isVerifyingOtp,
    isResettingPassword,
  }
}
