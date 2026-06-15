import "server-only"
import nodemailer from "nodemailer"

interface CenterDecisionNotificationPayload {
  centerId: string
  authUserId: string
  centerName: string
  contactEmail: string | null
  status: "active" | "deactive" | "rejected" | "blacklisted"
  approvalNote: string | null
  decidedAt: string | null
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

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function getWebsiteUrl() {
  return (
    process.env.NEXT_PUBLIC_WEBSITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://heliseeker.com"
  ).replace(/\/$/, "")
}

function getContactLine() {
  const contactEmail =
    process.env.CONTACT_EMAIL?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    ""
  const contactPhone =
    process.env.CONTACT_PHONE?.trim() ||
    process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() ||
    ""

  return [contactEmail, contactPhone].filter(Boolean).join(" / ")
}

function formatSignatureHtml() {
  const websiteUrl = getWebsiteUrl()
  const contactLine = getContactLine()

  return [
    "<p>Warm regards,<br />Team Heli Seeker</p>",
    `<p><a href="${escapeHtml(websiteUrl)}">${escapeHtml(websiteUrl)}</a></p>`,
    contactLine ? `<p>${escapeHtml(contactLine)}</p>` : "",
  ]
    .filter(Boolean)
    .join("")
}

function formatSignatureText() {
  const lines = ["Warm regards,", "Team Heli Seeker", getWebsiteUrl()]
  const contactLine = getContactLine()
  if (contactLine) lines.push(contactLine)
  return lines.join("\n")
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
      subject: "Registration Approved – Heli Seeker",
      html: `
        <p>Dear ${safeCenterName},</p>
        <p>Congratulations! Your registration with Heli Seeker has been approved successfully.</p>
        <p>You may now proceed to complete and manage your centre information through the platform. Our team will guide you through the next steps if required.</p>
        <p>We are excited to have you onboard and look forward to working with you.</p>
        ${formatSignatureHtml()}
      `,
      text: [
        `Dear ${payload.centerName},`,
        "",
        "Congratulations! Your registration with Heli Seeker has been approved successfully.",
        "",
        "You may now proceed to complete and manage your centre information through the platform. Our team will guide you through the next steps if required.",
        "",
        "We are excited to have you onboard and look forward to working with you.",
        "",
        formatSignatureText(),
      ].join("\n"),
    }
  }

  if (payload.status === "rejected") {
    return {
      to: payload.contactEmail,
      subject: "Registration Rejected – Heli Seeker",
      html: `
        <p>Dear ${safeCenterName},</p>
        <p>Thank you for registering with Heli Seeker.</p>
        <p>After reviewing your registration details, we regret to inform you that your registration has been rejected due to the following reason:</p>
        <p><strong>Reject Reason:</strong> ${safeApprovalNote || "Not specified"}</p>
        <p>You may review the submitted details, make the necessary corrections, and reapply through the platform.</p>
        <p>If you require any assistance or clarification, please feel free to contact our support team.</p>
        ${formatSignatureHtml()}
      `,
      text: [
        `Dear ${payload.centerName},`,
        "",
        "Thank you for registering with Heli Seeker.",
        "",
        "After reviewing your registration details, we regret to inform you that your registration has been rejected due to the following reason:",
        "",
        `Reject Reason: ${payload.approvalNote || "Not specified"}`,
        "",
        "You may review the submitted details, make the necessary corrections, and reapply through the platform.",
        "",
        "If you require any assistance or clarification, please feel free to contact our support team.",
        "",
        formatSignatureText(),
      ].join("\n"),
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
