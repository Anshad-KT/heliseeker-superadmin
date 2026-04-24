import { z } from "zod"

export const forgotPasswordEmailSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
})

export const forgotPasswordOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .length(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain numbers only"),
})

export const forgotPasswordResetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

export type ForgotPasswordEmailFormValues = z.infer<typeof forgotPasswordEmailSchema>
export type ForgotPasswordOtpFormValues = z.infer<typeof forgotPasswordOtpSchema>
export type ForgotPasswordResetFormValues = z.infer<typeof forgotPasswordResetSchema>
