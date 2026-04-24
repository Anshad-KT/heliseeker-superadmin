import { NextRequest, NextResponse } from "next/server"

import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const payload = (await request.json()) as {
    active?: boolean
    role?: string
    name?: string
    email?: string
  }

  const supabase = getServiceRoleSupabase()

  if (payload.role) {
    const normalizedRole = payload.role.trim().toLowerCase().replace(/[\s-]+/g, "_")
    if (normalizedRole === "super_admin") {
      payload.role = "super_admin"
    } else {
    const { data: roleRow, error: roleError } = await supabase
      .from("roles")
      .select("name")
      .ilike("name", payload.role.trim())
      .limit(1)
      .maybeSingle()

    if (roleError) {
      return NextResponse.json({ message: roleError.message }, { status: 500 })
    }

    if (!roleRow?.name) {
      return NextResponse.json({ message: "Invalid role. Create the role first." }, { status: 400 })
    }

    payload.role = roleRow.name
    }
  }

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("admin_id, auth_user_id")
    .eq("admin_id", id)
    .single()

  if (adminError || !adminRow) {
    return NextResponse.json({ message: adminError?.message || "Staff user not found" }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof payload.active === "boolean") updates.is_active = payload.active
  if (payload.role) updates.role = payload.role
  if (payload.name) updates.name = payload.name.trim()
  if (payload.email) updates.email = payload.email.trim().toLowerCase()

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("admins").update(updates).eq("admin_id", id)
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
  }

  if (payload.email && adminRow.auth_user_id) {
    const { error } = await supabase.auth.admin.updateUserById(adminRow.auth_user_id, {
      email: payload.email.trim().toLowerCase(),
    })
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const supabase = getServiceRoleSupabase()

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("admin_id, auth_user_id")
    .eq("admin_id", id)
    .single()

  if (adminError || !adminRow) {
    return NextResponse.json({ message: adminError?.message || "Staff user not found" }, { status: 404 })
  }

  const { error: deleteAdminError } = await supabase.from("admins").delete().eq("admin_id", id)
  if (deleteAdminError) {
    return NextResponse.json({ message: deleteAdminError.message }, { status: 500 })
  }

  if (adminRow.auth_user_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(adminRow.auth_user_id)
    if (authError) {
      return NextResponse.json({ message: authError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
