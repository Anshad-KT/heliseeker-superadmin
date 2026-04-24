import { NextRequest, NextResponse } from "next/server"

import { getServerSupabase } from "@/app/api/_lib/supabase"

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

export async function GET(_request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const config = getConfig(slug)
  if (!config) {
    return NextResponse.json({ message: "Unknown master type" }, { status: 400 })
  }

  const supabase = await getServerSupabase()
  const { data: userData } = await supabase.auth.getUser()
  const authUserId = userData?.user?.id
  let query = supabase.from(config.table).select("*")

  if (slug === "specializations" || slug === "departments" || slug === "services" || slug === "age-groups") {
    if (!authUserId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    query = query.eq("auth_user_id", authUserId)
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

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const config = getConfig(slug)
  if (!config) {
    return NextResponse.json({ message: "Unknown master type" }, { status: 400 })
  }

  const payload = (await request.json()) as Record<string, unknown>
  const supabase = await getServerSupabase()

  const { data: userData } = await supabase.auth.getUser()
  const authUserId = userData?.user?.id

  if (slug === "age-groups") {
    if (!authUserId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const rawName = typeof payload.name === "string" ? payload.name : ""
    const name = rawName.trim()
    if (name) {
      payload.name = name
      const { data: existing, error: existingError } = await supabase
        .from("age_groups")
        .select("id")
        .eq("auth_user_id", authUserId)
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

  const supabase = await getServerSupabase()

  if (slug === "age-groups" && payload.name !== undefined) {
    const { data: userData } = await supabase.auth.getUser()
    const authUserId = userData?.user?.id
    if (!authUserId) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
    }

    const rawName = typeof payload.name === "string" ? payload.name : ""
    const name = rawName.trim()
    payload.name = name

    if (name) {
      const { data: existing, error: existingError } = await supabase
        .from("age_groups")
        .select("id")
        .eq("auth_user_id", authUserId)
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

  const updatePayload = {
    ...pickAllowed(payload, config.allowed),
  }
  if (config.supportsUpdatedAt) {
    updatePayload.updated_at = new Date().toISOString()
  }

  const { data, error } = await supabase.from(config.table).update(updatePayload).eq("id", id).select().single()

  if (error) {
    if (isUniqueConstraintViolation(error)) {
      return NextResponse.json({ message: getDuplicateMessage(slug) }, { status: 409 })
    }
    return NextResponse.json({ message: error.message }, { status: 500 })
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

  const supabase = await getServerSupabase()
  const { error } = await supabase.from(config.table).delete().eq("id", payload.id)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: { id: payload.id } })
}
