import "server-only"
import nodemailer from "nodemailer"

interface CenterDecisionNotificationPayload {
  centerId: string
  authUserId: string
  centerName: string
  contactEmail: string | null
  status: "active" | "deactive" | "rejected" | "blacklisted"
  approvalNote: string | null
  decidedAt: Date | null
}

interface CenterDecisionEmailPayload {
  to: string
  subject: string
  html: string
  text: string
}

interface CenterDecisionNotificationResult {
  dispatched: boolean
  reason?: string
}

const DEFAULT_TIMEOUT_MS = 5000
const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://heli-seeker-center-portal-nu.vercel.app/login"

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function buildCenterDecisionEmail(payload: CenterDecisionNotificationPayload): CenterDecisionEmailPayload | null {
  if (!payload.contactEmail) {
    return null
  }

  const safeCenterName = escapeHtml(payload.centerName)
  const safeApprovalNote = payload.approvalNote ? escapeHtml(payload.approvalNote) : null

  if (payload.status === "active") {
    return {
      to: payload.contactEmail,
      subject: "Your center profile has been approved",
      html: `
        <p>Hello,</p>
        <p>Your center profile for <strong>${safeCenterName}</strong> has been approved.</p>
        <p>You can now access your center portal.</p>
        <p><a href="${PORTAL_URL}/login">Go to portal</a></p>
      `,
      text: `Hello,\n\nYour center profile for ${payload.centerName} has been approved.\nYou can now access your center portal.\n\nPortal: ${PORTAL_URL}/login`,
    }
  }

  if (payload.status === "rejected") {
    return {
      to: payload.contactEmail,
      subject: "Your center profile request was rejected",
      html: `
        <p>Hello,</p>
        <p>Your center profile request for <strong>${safeCenterName}</strong> has been rejected.</p>
        ${safeApprovalNote ? `<p>Reason: ${safeApprovalNote}</p>` : ""}
        <p>Please update your details and resubmit your onboarding request.</p>
      `,
      text: `Hello,\n\nYour center profile request for ${payload.centerName} has been rejected.${payload.approvalNote ? `\nReason: ${payload.approvalNote}` : ""}\n\nPlease update your details and resubmit your onboarding request.`,
    }
  }

  return null
}

async function dispatchCenterDecisionEmail(email: CenterDecisionEmailPayload): Promise<CenterDecisionNotificationResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL

  try {
    if (apiKey && fromEmail) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)

      const response = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
          signal: controller.signal,
        },
      ).finally(() => clearTimeout(timeoutId))

      if (!response.ok) {
        const errorText = await response.text()
        return {
          dispatched: false,
          reason: `Resend email request failed (${response.status}): ${errorText || "Unknown error"}`,
        }
      }

      return { dispatched: true }
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || 587)
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      return {
        dispatched: false,
        reason: "Email is not configured (set RESEND_API_KEY/RESEND_FROM_EMAIL or SMTP_HOST/SMTP_USER/SMTP_PASS/SMTP_FROM)",
      }
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: smtpFrom,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    })

    return { dispatched: true }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unknown email error"
    return { dispatched: false, reason }
  }
}

export async function dispatchCenterDecisionNotification(
  payload: CenterDecisionNotificationPayload,
): Promise<CenterDecisionNotificationResult> {
  const webhookUrl = process.env.CENTER_APPROVAL_NOTIFICATION_WEBHOOK_URL?.trim()
  const emailPayload = buildCenterDecisionEmail(payload)

  if (webhookUrl) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
      const channelHints = emailPayload ? ["email", "in-app"] : ["in-app"]

      const response = await fetch(
        webhookUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event: "center.approval.decided",
            channelHints,
            email: emailPayload,
            payload,
          }),
          signal: controller.signal,
        },
      ).finally(() => clearTimeout(timeoutId))

      if (response.ok) {
        return { dispatched: true }
      }
    } catch (error) {
      console.warn(
        `[dispatchCenterDecisionNotification] webhook dispatch failed: ${error instanceof Error ? error.message : "unknown error"}`,
      )
    }
  }

  if (!emailPayload) {
    if (!payload.contactEmail) {
      return { dispatched: false, reason: "Center does not have a contact email" }
    }
    return { dispatched: false, reason: `No email template for status: ${payload.status}` }
  }

  return dispatchCenterDecisionEmail(emailPayload)
}
