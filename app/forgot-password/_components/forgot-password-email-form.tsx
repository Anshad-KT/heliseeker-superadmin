"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { forgotPasswordCopy } from "../_constants"
import { useForgotPassword } from "../_hooks/use-forgot-password"
import { forgotPasswordEmailSchema, type ForgotPasswordEmailFormValues } from "../_schemas"

export function ForgotPasswordEmailForm() {
  const { submitEmail, isSendingOtp } = useForgotPassword()

  const form = useForm<ForgotPasswordEmailFormValues>({
    resolver: zodResolver(forgotPasswordEmailSchema),
    defaultValues: {
      email: "",
    },
  })

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{forgotPasswordCopy.heading}</h2>
        <p className="text-sm text-muted-foreground">
          Enter your admin email address and we&apos;ll send a 6-digit OTP.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((values) => submitEmail(values))} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="email"
                    placeholder="Enter your email"
                    {...field}
                    onChange={(event) => field.onChange(event.target.value.toLowerCase())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSendingOtp} className="w-full">
            {isSendingOtp ? "Sending..." : "Send OTP"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      </p>
    </>
  )
}
