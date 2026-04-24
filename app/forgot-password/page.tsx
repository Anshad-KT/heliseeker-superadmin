import { ForgotPasswordEmailForm } from "./_components/forgot-password-email-form"
import { ForgotPasswordShell } from "./_components/forgot-password-shell"

export default function ForgotPasswordPage() {
  return (
    <ForgotPasswordShell>
      <ForgotPasswordEmailForm />
    </ForgotPasswordShell>
  )
}
