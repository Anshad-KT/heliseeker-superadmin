import { NextResponse } from "next/server"

import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

const LOCATION_CITY_ALIASES: Record<string, string> = {
  panthirankavu: "Kozhikkode",
  nadakkavu: "Kozhikkode",
  pottammal: "Kozhikkode",
  calicut: "Kozhikkode",
  kozhikode: "Kozhikkode",
  kozhikkode: "Kozhikkode",
}

function normalizeLocationKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s,/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function toDisplayLocation(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getMajorCity(location: string | null | undefined) {
  const normalized = normalizeLocationKey(location || "")

  if (!normalized) return "Unknown"

  const parts = normalized
    .split(/[,-/]/)
    .map((part) => part.trim())
    .filter(Boolean)

  for (const part of parts) {
    const mappedCity = LOCATION_CITY_ALIASES[part]
    if (mappedCity) return mappedCity
  }

  const exactMatch = LOCATION_CITY_ALIASES[normalized]
  if (exactMatch) return exactMatch

  return toDisplayLocation(parts[parts.length - 1] || normalized)
}

function readAuthUserName(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return null

  const candidates = [
    metadata.full_name,
    metadata.name,
    metadata.user_name,
    metadata.preferred_username,
    metadata.given_name,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  return null
}

export async function GET() {
  const adminSupabase = getServiceRoleSupabase()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    submittedCentersResult,
    activeCentersResult,
    rejectedCentersResult,
    centersResult,
    centerSettingsResult,
    referralRequestsResult,
    newUsersResult,
    totalUsersResult,
  ] = await Promise.all([
    adminSupabase
      .from("center_profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "submitted"),
    adminSupabase
      .from("center_profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "active"),
    adminSupabase
      .from("center_profiles")
      .select("id", { count: "exact", head: true })
      .eq("approval_status", "rejected"),
    adminSupabase
      .from("center_profiles")
      .select("id, auth_user_id, center_name, approval_status, created_at"),
    adminSupabase
      .from("center_settings")
      .select("auth_user_id, location"),
    adminSupabase
      .from("client_referral_requests")
      .select("id", { count: "exact", head: true }),
    adminSupabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("user_type", "customer")
      .gte("created_at", sevenDaysAgo),
    adminSupabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("user_type", "customer"),
  ])

  const criticalErrors = [
    submittedCentersResult.error,
    activeCentersResult.error,
    rejectedCentersResult.error,
    centersResult.error,
  ].filter(Boolean)

  if (criticalErrors.length > 0) {
    return NextResponse.json({ message: criticalErrors[0]?.message || "Failed to load dashboard data" }, { status: 500 })
  }

  if (centerSettingsResult.error) {
    console.error("dashboard center settings query failed", centerSettingsResult.error)
  }

  if (referralRequestsResult.error) {
    console.error("dashboard referral requests query failed", referralRequestsResult.error)
  }

  if (newUsersResult.error) {
    console.error("dashboard new users query failed", newUsersResult.error)
  }

  if (totalUsersResult.error) {
    console.error("dashboard total users query failed", totalUsersResult.error)
  }

  const settingsByAuthUserId = new Map(
    (centerSettingsResult.data || [])
      .filter((row) => Boolean(row.auth_user_id))
      .map((row) => [row.auth_user_id as string, row]),
  )

  const centersByLocation = Object.values(
    (centersResult.data || []).reduce<
      Record<string, { location: string; total: number; active: number; pending: number }>
    >((acc, row) => {
      if (!row.auth_user_id) return acc

      const settings = settingsByAuthUserId.get(row.auth_user_id)
      const location = getMajorCity(settings?.location)

      if (!acc[location]) {
        acc[location] = {
          location,
          total: 0,
          active: 0,
          pending: 0,
        }
      }

      acc[location].total += 1

      if (row.approval_status === "active") {
        acc[location].active += 1
      }

      if (row.approval_status === "submitted" || row.approval_status === "pending") {
        acc[location].pending += 1
      }

      return acc
    }, {}),
  )
    .sort((a, b) => b.total - a.total || a.location.localeCompare(b.location))

  const recentCenters = (centersResult.data || [])
    .slice()
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 6)
    .map((row) => {
      const settings = settingsByAuthUserId.get(row.auth_user_id || "")

      return {
        id: row.id,
        centerName: row.center_name?.trim() || "Unnamed Center",
        location: getMajorCity(settings?.location),
        approvalStatus: row.approval_status || "submitted",
        createdAt: row.created_at,
      }
    })

  const { data: customerRows, error: customerError } = await adminSupabase
    .from("users")
    .select("id, auth_user_id, email, user_type, created_at, customer_profiles(user_id, guardian_name, child_name, phone_number, created_at)")
    .eq("user_type", "customer")
    .order("created_at", { ascending: false })
    .limit(20)

  if (customerError) {
    console.error("dashboard customer query failed", customerError)
  }

  const baseUsers = ((customerRows || []) as typeof customerRows).map((item) => {
    const profile = Array.isArray(item.customer_profiles) ? item.customer_profiles[0] : item.customer_profiles
    return {
      authUserId: item.auth_user_id ?? null,
      id: item.id,
      email: item.email ?? null,
      phoneNumber: profile?.phone_number ?? null,
      profileName: profile?.guardian_name || profile?.child_name || null,
    }
  })

  const authFallbacks = await Promise.all(
    baseUsers.map(async (user) => {
      if ((!user.email && !user.profileName) && user.authUserId) {
        const { data, error } = await adminSupabase.auth.admin.getUserById(user.authUserId)

        if (error) {
          console.error("dashboard auth user lookup failed", error)
          return { email: null, profileName: null }
        }

        return {
          email: data.user?.email ?? null,
          profileName: readAuthUserName((data.user?.user_metadata as Record<string, unknown> | undefined) ?? null),
        }
      }

      return { email: null, profileName: null }
    }),
  )

  const users = baseUsers.map((user, index) => ({
    id: user.id,
    email: user.email || authFallbacks[index]?.email || null,
    phoneNumber: user.phoneNumber ?? null,
    profileName: user.profileName || authFallbacks[index]?.profileName || null,
  }))

  return NextResponse.json({
    centers: {
      total: centersResult.data?.length ?? 0,
      pending: submittedCentersResult.count ?? 0,
      submitted: submittedCentersResult.count ?? 0,
      active: activeCentersResult.count ?? 0,
      rejected: rejectedCentersResult.count ?? 0,
    },
    centersByLocation,
    leadsCount: referralRequestsResult.error ? 0 : (referralRequestsResult.count ?? 0),
    newUsersLast7Days: newUsersResult.error ? 0 : (newUsersResult.count ?? 0),
    recentCenters,
    totalUsers: totalUsersResult.error ? users.length : (totalUsersResult.count ?? users.length),
    users,
    seo: {
      metaTitle: "",
      metaDescription: "",
    },
  })
}
