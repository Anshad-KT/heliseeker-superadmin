import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"

import { getServerSupabase } from "@/app/api/_lib/supabase"
import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

export async function GET() {
  const supabase = await getServerSupabase()
  const { data, error } = await supabase
    .from("admins")
    .select("admin_id, auth_user_id, name, email, role, is_active, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const normalized = (data || []).map((admin) => ({
    id: admin.admin_id,
    authUserId: admin.auth_user_id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    active: admin.is_active,
    createdAt: admin.created_at,
  }))

  return NextResponse.json({ data: normalized })
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      name: string
      email: string
      role: string
    }

    const name = payload.name?.trim()
    const email = payload.email?.trim().toLowerCase()
    let role = payload.role?.trim()

    if (!name || !email || !role) {
      return NextResponse.json({ message: "Name, email and role are required" }, { status: 400 })
    }

    const supabase = getServiceRoleSupabase()

    const normalizedRole = role.toLowerCase().replace(/[\s-]+/g, "_")
    if (normalizedRole === "super_admin") {
      role = "super_admin"
    } else {
      const { data: roleRow, error: roleError } = await supabase
        .from("roles")
        .select("name")
        .ilike("name", role)
        .limit(1)
        .maybeSingle()

      if (roleError) {
        return NextResponse.json({ message: roleError.message }, { status: 500 })
      }

      if (!roleRow?.name) {
        return NextResponse.json({ message: "Invalid role. Create the role first." }, { status: 400 })
      }

      role = roleRow.name
    }

    const smtpHost = process.env.SMTP_HOST
    const smtpPort = Number(process.env.SMTP_PORT || 587)
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS
    const smtpFrom = process.env.SMTP_FROM
    const superadminBaseUrl =
      process.env.NEXT_PUBLIC_SUPERADMIN_URL ||
      process.env.SUPERADMIN_APP_URL ||
      "https://heli-seeker-superadmin.vercel.app"
    const appUrl = superadminBaseUrl || process.env.NEXT_PUBLIC_APP_URL || `${request.nextUrl.origin}`

    console.log("SMTP Config:", { smtpHost, smtpPort, smtpUser, smtpPass: !!smtpPass, smtpFrom });
    

    if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
      return NextResponse.json({ message: "Missing SMTP configuration." }, { status: 500 })
    }

    const tempPassword = `Temp@${crypto.randomUUID().slice(0, 12)}`

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    })

    if (createError || !created?.user?.id) {
      const msg = createError?.message || "Failed to create user"
      return NextResponse.json({ message: msg }, { status: /already registered|email.*exists|duplicate/i.test(msg) ? 409 : 500 })
    }

    const authUserId = created.user.id

    const { data: adminRow, error: adminError } = await supabase
      .from("admins")
      .insert([
        {
          auth_user_id: authUserId,
          name,
          email,
          role,
          is_active: true,
        },
      ])
      .select()
      .single()

    if (adminError || !adminRow?.admin_id) {
      await supabase.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ message: adminError?.message || "Failed to create admin record" }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    const loginUrl = `${appUrl.replace(/\/$/, "")}/login`
    const supportUrl = `${appUrl.replace(/\/$/, "")}/admin/change-password`

    const html = `
      <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
        <p>Hi ${name},</p>
        <p>Your admin account has been created. Use the temporary password below to sign in:</p>
        <p style="font-size:16px;"><strong>${tempPassword}</strong></p>
        <p>Login here: <a href="${loginUrl}">${loginUrl}</a></p>
        <p>On first login, you will be required to change your password.</p>
        <p>If you face any issues, visit: <a href="${supportUrl}">${supportUrl}</a></p>
      </div>
    `

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: "Your Admin Access — Temporary Password",
      text: `Hi ${name},\n\nYour admin account has been created.\nTemporary password: ${tempPassword}\nLogin: ${loginUrl}\nOn first login, you will be required to change your password.\n`,
      html,
    })

    return NextResponse.json(
      {
        data: {
          id: adminRow.admin_id,
          authUserId,
          name,
          email,
          role: adminRow.role,
          active: adminRow.is_active,
          createdAt: adminRow.created_at,
        },
        tempPassword,
        emailQueued: true,
        emailError: null,
      },
      { status: 201 },
    )
  } catch (err: any) {
    return NextResponse.json({ message: err?.message || "Failed to create staff user" }, { status: 500 })
  }
}
