import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"

import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.toLowerCase() || ""
  const supabase = getServiceRoleSupabase()

  const authUsersById = new Map<string, Record<string, unknown>>()
  const perPage = 1000
  let page = 1
  let hasMoreAuthUsers = true

  while (hasMoreAuthUsers) {
    const { data: authUsers } = await supabase.auth.admin.listUsers({ page, perPage })
    const users = authUsers?.users ?? []

    users.forEach((user) => {
      authUsersById.set(user.id, (user.user_metadata ?? {}) as Record<string, unknown>)
    })

    hasMoreAuthUsers = users.length === perPage
    page += 1
  }

  const { data, error } = await supabase
    .from("customer_profiles")
    .select(
      "auth_user_id, user_id, guardian_name, country_of_residency, phone_number, nationality, child_name, child_dob, primary_language, is_active, created_at, updated_at, users(id, email, user_type, is_verified, created_at)",
    )
    .eq("users.user_type", "customer")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  const normalized = (data || []).map((item) => {
    const user = Array.isArray(item.users) ? item.users[0] : item.users
    const metadata = item.auth_user_id ? authUsersById.get(item.auth_user_id) : undefined
    const avatarUrl = typeof metadata?.avatar_url === "string" ? metadata.avatar_url : ""
    const name = item.guardian_name || item.child_name || user?.email || "Website User"
    return {
      id: user?.id || item.user_id,
      name,
      email: user?.email ?? "",
      guardianName: item.guardian_name ?? "",
      guardianEmail: user?.email ?? "",
      countryOfResidency: item.country_of_residency ?? "",
      phoneNumber: item.phone_number ?? "",
      nationality: item.nationality ?? "",
      childName: item.child_name ?? "",
      dateOfBirth: item.child_dob ?? "",
      primaryLanguage: item.primary_language ?? "",
      avatarUrl,
      isVerified: user?.is_verified ?? false,
      isActive: item.is_active ?? true,
      userType: user?.user_type,
      createdAt: user?.created_at || item.created_at,
      updatedAt: item.updated_at,
    }
  }).filter((user) => Boolean(user.id))

  const filtered = query
    ? normalized.filter((user) => {
        const haystack = [
          user.name,
          user.email,
          user.guardianName,
          user.guardianEmail,
          user.phoneNumber,
          user.countryOfResidency,
          user.nationality,
          user.childName,
          user.primaryLanguage,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return haystack.includes(query)
      })
    : normalized

  return NextResponse.json({ data: filtered })
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as { name: string; email: string }
  const name = payload.name?.trim()
  const email = payload.email?.trim().toLowerCase()

  if (!name || !email) {
    return NextResponse.json({ message: "Name and email are required" }, { status: 400 })
  }

  const tempPassword = `Temp@${crypto.randomBytes(6).toString("hex")}`
  const adminSupabase = getServiceRoleSupabase()

  const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  })

  if (createError || !created?.user?.id) {
    return NextResponse.json({ message: createError?.message || "Failed to create user" }, { status: 500 })
  }

  const authUserId = created.user.id

  const { data: userRow, error: userError } = await adminSupabase
    .from("users")
    .insert([
      {
        auth_user_id: authUserId,
        email,
        user_type: "customer",
        is_verified: false,
      },
    ])
    .select()
    .single()

  if (userError || !userRow?.id) {
    await adminSupabase.auth.admin.deleteUser(authUserId)
    return NextResponse.json({ message: userError?.message || "Failed to create user record" }, { status: 500 })
  }

  const { error: profileError } = await adminSupabase.from("customer_profiles").insert([
    {
      auth_user_id: authUserId,
      user_id: userRow.id,
      guardian_name: name,
      is_active: true,
    },
  ])
  if (profileError) {
    // Profile is optional for listing; proceed with created user
  }

  return NextResponse.json(
    {
      data: {
        id: userRow.id,
        name,
        email,
        isVerified: userRow.is_verified ?? false,
        createdAt: userRow.created_at,
      },
      tempPassword,
    },
    { status: 201 },
  )
}
