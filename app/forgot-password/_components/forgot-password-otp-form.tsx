"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  forgotPasswordCopy,
  forgotPasswordOtpLength,
  forgotPasswordOtpResendCooldownSeconds,
} from "../_constants"
import { useForgotPassword } from "../_hooks/use-forgot-password"
import { forgotPasswordOtpSchema, type ForgotPasswordOtpFormValues } from "../_schemas"
import {
  getRecoveryEmail,
  getRecoveryOtpSentAt,
  maskRecoveryEmail,
  setRecoveryOtpSentAt,
  subscribeRecoveryStore,
} from "../_utils"

export function ForgotPasswordOtpForm() {
  const router = useRouter()
  const { submitOtp, resendOtp, isResendingOtp, isVerifyingOtp } = useForgotPassword()
  const [now, setNow] = useState(() => Date.now())

  const form = useForm<ForgotPasswordOtpFormValues>({
    resolver: zodResolver(forgotPasswordOtpSchema),
    defaultValues: {
      otp: "",
    },
  })

  const recoveryEmail = useSyncExternalStore(subscribeRecoveryStore, getRecoveryEmail, () => "")
  const maskedEmail = useMemo(() => maskRecoveryEmail(recoveryEmail), [recoveryEmail])
  const otpSentAt = useSyncExternalStore(subscribeRecoveryStore, getRecoveryOtpSentAt, () => 0)

  const secondsLeft = useMemo(() => {
    if (!recoveryEmail) return 0
    if (!otpSentAt) return forgotPasswordOtpResendCooldownSeconds
    const elapsedSeconds = Math.floor((now - otpSentAt) / 1000)
    return Math.max(0, forgotPasswordOtpResendCooldownSeconds - elapsedSeconds)
  }, [now, otpSentAt, recoveryEmail])

  useEffect(() => {
    if (!recoveryEmail) {
      router.replace("/forgot-password")
      return
    }

    if (!otpSentAt) {
      setRecoveryOtpSentAt()
    }
  }, [otpSentAt, recoveryEmail, router])

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{forgotPasswordCopy.otpHeading}</h2>
        <p className="text-sm text-muted-foreground">We sent a code to {maskedEmail}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => submitOtp(values))} className="space-y-5">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP
                    maxLength={forgotPasswordOtpLength}
                    value={field.value}
                    onChange={field.onChange}
                    containerClassName="w-full justify-start"
                    className="w-full"
                  >
                    <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
                      {Array.from({ length: forgotPasswordOtpLength }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-12 w-full rounded-md border text-base first:rounded-md first:border"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isVerifyingOtp} className="w-full">
            {isVerifyingOtp ? "Verifying..." : "Verify OTP"}
          </Button>
        </form>
      </Form>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Didn&apos;t receive code?{" "}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={resendOtp}
            disabled={secondsLeft > 0 || isResendingOtp}
          >
            {isResendingOtp ? "Resending..." : "Resend OTP"}
          </Button>
        </p>
        <span>00:{String(secondsLeft).padStart(2, "0")}</span>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Wrong email?{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Start again
        </Link>
      </p>
    </>
  )
}
