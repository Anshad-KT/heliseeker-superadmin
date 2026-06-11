import { NextRequest, NextResponse } from "next/server"

import { getServerSupabase } from "@/app/api/_lib/supabase"
import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

const masterTableMap = {
  departments: {
    table: "departments",
    required: ["name"],
    allowed: ["name", "description", "status", "auth_user_id"],
    orderBy: { column: "created_at", ascending: false },
    supportsUpdatedAt: true,
  },
  languages: {
    table: "languages",
    required: ["name"],
    allowed: ["name", "description", "auth_user_id"],
    orderBy: { column: "name", ascending: true },
    supportsUpdatedAt: false,
  },
  services: {
    table: "services",
    required: ["service_name", "department_id"],
    allowed: ["service_name", "description", "department_id", "age_group_id", "status", "auth_user_id"],
    orderBy: { column: "created_at", ascending: false },
    supportsUpdatedAt: true,
    junctionTable: "service_specializations",
    junctionForeignKey: "service_id",
    junctionRefKey: "specialization_id",
  },
  specializations: {
    table: "specializations",
    required: ["name"],
    allowed: ["name", "description", "auth_user_id"],
    orderBy: { column: "created_at", ascending: false },
    supportsUpdatedAt: false,
  },
  "age-groups": {
    table: "age_groups",
    required: ["name", "from_age", "to_age", "unit"],
    allowed: ["name", "description", "from_age", "to_age", "unit", "status", "auth_user_id"],
    orderBy: [
      { column: "from_age", ascending: true },
      { column: "to_age", ascending: true },
      { column: "name", ascending: true },
    ],
    supportsUpdatedAt: false,
  },
} as const

type MasterSlug = keyof typeof masterTableMap

function getConfig(slug: string) {
  return masterTableMap[slug as MasterSlug]
}

function isUniqueConstraintViolation(error: any) {
  const message = typeof error?.message === "string" ? error.message : ""
  const code = typeof error?.code === "string" ? error.code : ""
  return code === "23505" || /duplicate key value violates unique constraint/i.test(message)
}

function getDuplicateMessage(slug: string) {
  if (slug === "departments") return "A department with this name already exists. Duplicates are not allowed."
  if (slug === "services") return "A service with this name already exists. Duplicates are not allowed."
  if (slug === "specializations") return "A specialization with this name already exists. Duplicates are not allowed."
  if (slug === "age-groups") return "An age group with this name already exists. Duplicates are not allowed."
  return "Duplicate entry not allowed."
}

function pickAllowed(payload: Record<string, unknown>, allowed: readonly string[]) {
  return Object.fromEntries(Object.entries(payload).filter(([key]) => allowed.includes(key)))
}

function shouldScopeByAuthUser(slug: string) {
  return slug === "specializations" || slug === "departments" || slug === "services" || slug === "age-groups"
}

async function getRequestContext() {
  const sessionSupabase = await getServerSupabase()
  const { data: userData } = await sessionSupabase.auth.getUser()
  const authUserId = userData?.user?.id

  if (!authUserId) {
    return { error: NextResponse.json({ message: "Not authenticated" }, { status: 401 }) }
  }

  try {
    const serviceRoleSupabase = getServiceRoleSupabase()
    return { supabase: serviceRoleSupabase, authUserId, error: null }
  } catch {
    // Fallback keeps local/dev flows working when service-role env vars are absent.
    return { supabase: sessionSupabase, authUserId, error: null }
  }
}

async function getAdminAuthUserIds(supabase: any, fallbackAuthUserId: string) {
  const { data, error } = await supabase
    .from("admins")
    .select("auth_user_id")
    .not("auth_user_id", "is", null)

  if (error) {
    return { adminAuthUserIds: [fallbackAuthUserId], error }
  }

  const adminAuthUserIds = Array.from(
    new Set((data || []).map((admin: { auth_user_id: string | null }) => admin.auth_user_id).filter(Boolean) as string[]),
  )

  return {
    adminAuthUserIds: adminAuthUserIds.length > 0 ? adminAuthUserIds : [fallbackAuthUserId],
    error: null,
  }
}

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const config = getConfig(slug)
  if (!config) {
    return NextResponse.json({ message: "Unknown master type" }, { status: 400 })
  }

  const requestContext = await getRequestContext()
  if (requestContext.error) return requestContext.error
  const { supabase, authUserId } = requestContext

  let query = supabase.from(config.table).select("*")

  if (shouldScopeByAuthUser(slug)) {
    const { adminAuthUserIds, error } = await getAdminAuthUserIds(supabase, authUserId)
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 500 })
    }

    query = query.in("auth_user_id", adminAuthUserIds)
  }

  if (config.orderBy) {
    const orders = Array.isArray(config.orderBy) ? config.orderBy : [config.orderBy]
    for (const order of orders) {
      query = query.order(order.column, { ascending: order.ascending })
    }
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  // For services, also fetch the specialization_ids from junction table
  if (slug === "services" && data) {
    const serviceIds = data.map((item: any) => item.id)
    if (serviceIds.length > 0) {
      const { data: junctionData, error: junctionError } = await supabase
        .from(config.junctionTable!)
        .select(config.junctionForeignKey + "," + config.junctionRefKey)
        .in(config.junctionForeignKey, serviceIds)

      if (!junctionError && junctionData) {
        const specMap = new Map<string, string[]>()
        for (const row of junctionData) {
          const serviceId = row[config.junctionForeignKey]
          const specId = row[config.junctionRefKey]
          if (!specMap.has(serviceId)) {
            specMap.set(serviceId, [])
          }
          specMap.get(serviceId)!.push(specId)
        }

        for (const item of data) {
          item.specialization_ids = specMap.get(item.id) || []
        }
      }
    }
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const config = getConfig(slug)
  if (!config) {
    return NextResponse.json({ message: "Unknown master type" }, { status: 400 })
  }

  const payload = (await request.json()) as Record<string, unknown>
  const requestContext = await getRequestContext()
  if (requestContext.error) return requestContext.error
  const { supabase, authUserId } = requestContext

  if (slug === "age-groups") {
    const { adminAuthUserIds, error: adminAuthUserIdsError } = await getAdminAuthUserIds(supabase, authUserId)
    if (adminAuthUserIdsError) {
      return NextResponse.json({ message: adminAuthUserIdsError.message }, { status: 500 })
    }

    const rawName = typeof payload.name === "string" ? payload.name : ""
    const name = rawName.trim()
    if (name) {
      payload.name = name
      const { data: existing, error: existingError } = await supabase
        .from("age_groups")
        .select("id")
        .in("auth_user_id", adminAuthUserIds)
        .ilike("name", name)
        .limit(1)

      if (existingError) {
        return NextResponse.json({ message: existingError.message }, { status: 500 })
      }

      if ((existing || []).length > 0) {
        return NextResponse.json({ message: "Age group already exists" }, { status: 409 })
      }
    }
  }

  const missing = config.required.filter((key) => payload[key] === undefined || payload[key] === null || payload[key] === "")
  if (missing.length > 0) {
    return NextResponse.json({ message: `Missing required fields: ${missing.join(", ")}` }, { status: 400 })
  }

  const insertPayload: Record<string, unknown> = {
    ...pickAllowed(payload, config.allowed),
    ...(authUserId ? { auth_user_id: authUserId } : {}),
  }

  const { data, error } = await supabase.from(config.table).insert([insertPayload]).select().single()

  if (error) {
    if (isUniqueConstraintViolation(error)) {
      return NextResponse.json({ message: getDuplicateMessage(slug) }, { status: 409 })
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  // Sync junction table if applicable
  if (slug === "services" && data && payload.specialization_ids) {
    const specializationIds = payload.specialization_ids as string[]
    if (Array.isArray(specializationIds) && specializationIds.length > 0) {
      const junctionRows = specializationIds.map((specId: string) => ({
        [config.junctionForeignKey]: data.id,
        [config.junctionRefKey]: specId,
      }))
      const { error: junctionError } = await supabase
        .from(config.junctionTable!)
        .insert(junctionRows)
      if (junctionError) {
        console.error("Failed to sync junction table:", junctionError)
      }
    }
  }

  return NextResponse.json({ data }, { status: 201 })
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const config = getConfig(slug)
  if (!config) {
    return NextResponse.json({ message: "Unknown master type" }, { status: 400 })
  }

  const payload = (await request.json()) as Record<string, unknown>
  const id = payload.id as string | undefined
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 })
  }

  const requestContext = await getRequestContext()
  if (requestContext.error) return requestContext.error
  const { supabase, authUserId } = requestContext

  if (slug === "age-groups" && payload.name !== undefined) {
    const { adminAuthUserIds, error: adminAuthUserIdsError } = await getAdminAuthUserIds(supabase, authUserId)
    if (adminAuthUserIdsError) {
      return NextResponse.json({ message: adminAuthUserIdsError.message }, { status: 500 })
    }

    const rawName = typeof payload.name === "string" ? payload.name : ""
    const name = rawName.trim()
    payload.name = name

    if (name) {
      const { data: existing, error: existingError } = await supabase
        .from("age_groups")
        .select("id")
        .in("auth_user_id", adminAuthUserIds)
        .ilike("name", name)
        .neq("id", id)
        .limit(1)

      if (existingError) {
        return NextResponse.json({ message: existingError.message }, { status: 500 })
      }

      if ((existing || []).length > 0) {
        return NextResponse.json({ message: "Age group already exists" }, { status: 409 })
      }
    }
  }

  const updatePayload: Record<string, unknown> = {
    ...pickAllowed(payload, config.allowed),
  }
  delete updatePayload.auth_user_id

  if (config.supportsUpdatedAt) {
    updatePayload.updated_at = new Date().toISOString()
  }

  let updateQuery = supabase.from(config.table).update(updatePayload).eq("id", id)
  if (shouldScopeByAuthUser(slug)) {
    const { adminAuthUserIds, error: adminAuthUserIdsError } = await getAdminAuthUserIds(supabase, authUserId)
    if (adminAuthUserIdsError) {
      return NextResponse.json({ message: adminAuthUserIdsError.message }, { status: 500 })
    }

    updateQuery = updateQuery.in("auth_user_id", adminAuthUserIds)
  }

  const { data, error } = await updateQuery.select().maybeSingle()

  if (error) {
    if (isUniqueConstraintViolation(error)) {
      return NextResponse.json({ message: getDuplicateMessage(slug) }, { status: 409 })
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ message: "Item not found" }, { status: 404 })
  }

  // Sync junction table for services if specialization_ids provided
  if (slug === "services" && payload.specialization_ids !== undefined) {
    const specializationIds = payload.specialization_ids as string[]
    if (Array.isArray(specializationIds)) {
      // Delete existing junctions
      const { error: deleteJunctionError } = await supabase
        .from(config.junctionTable!)
        .delete()
        .eq(config.junctionForeignKey, id)
      if (deleteJunctionError) {
        console.error("Failed to delete old junction rows:", deleteJunctionError)
      }

      // Insert new junctions
      if (specializationIds.length > 0) {
        const junctionRows = specializationIds.map((specId: string) => ({
          [config.junctionForeignKey]: id,
          [config.junctionRefKey]: specId,
        }))
        const { error: insertJunctionError } = await supabase
          .from(config.junctionTable!)
          .insert(junctionRows)
        if (insertJunctionError) {
          console.error("Failed to insert new junction rows:", insertJunctionError)
        }
      }
    }
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const config = getConfig(slug)
  if (!config) {
    return NextResponse.json({ message: "Unknown master type" }, { status: 400 })
  }

  const payload = (await request.json()) as { id?: string }
  if (!payload.id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 })
  }

  const requestContext = await getRequestContext()
  if (requestContext.error) return requestContext.error
  const { supabase, authUserId } = requestContext

  let deleteQuery = supabase.from(config.table).delete().eq("id", payload.id)
  if (shouldScopeByAuthUser(slug)) {
    const { adminAuthUserIds, error: adminAuthUserIdsError } = await getAdminAuthUserIds(supabase, authUserId)
    if (adminAuthUserIdsError) {
      return NextResponse.json({ message: adminAuthUserIdsError.message }, { status: 500 })
    }

    deleteQuery = deleteQuery.in("auth_user_id", adminAuthUserIds)
  }

  const { error } = await deleteQuery

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { id: payload.id } })
}