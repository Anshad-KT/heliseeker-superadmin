import { NextRequest, NextResponse } from "next/server"

import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"
import type { FlatPage } from "@/lib/admin-panel/types"
import { normalizeFlatPageHtml } from "../_lib/flat-page-html"

type FlatPageRow = {
  id: string
  title: string
  slug: string
  description: string
  enabled: boolean
  updated_at: string
}

function toFlatPage(row: FlatPageRow): FlatPage {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    enabled: row.enabled,
    updatedAt: row.updated_at,
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getServiceRoleSupabase()
    const { id } = await context.params
    const payload = (await request.json()) as {
      title?: string
      slug?: string
      description?: string
      enabled?: boolean
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { updated_at: now }
    const shouldNormalize = typeof payload.title === "string" || typeof payload.description === "string"
    let nextTitle = typeof payload.title === "string" ? payload.title : undefined
    let nextDescription = typeof payload.description === "string" ? payload.description : undefined

    if (shouldNormalize && (!nextTitle || !nextDescription)) {
      const { data: existing, error: existingError } = await supabase
        .from("flat_pages")
        .select("title,description")
        .eq("id", id)
        .maybeSingle()

      if (existingError) {
        return NextResponse.json({ error: existingError.message }, { status: 500 })
      }

      nextTitle = nextTitle ?? existing?.title ?? ""
      nextDescription = nextDescription ?? existing?.description ?? ""
    }

    if (typeof payload.title === "string") updates.title = payload.title
    if (typeof payload.slug === "string") updates.slug = payload.slug
    if (shouldNormalize) {
      updates.description = normalizeFlatPageHtml(nextTitle ?? "", nextDescription ?? "")
    }
    if (typeof payload.enabled === "boolean") updates.enabled = payload.enabled

    const { data, error } = await supabase
      .from("flat_pages")
      .update(updates)
      .eq("id", id)
      .select("id,title,slug,description,enabled,updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: toFlatPage(data as FlatPageRow) })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: message || "Failed to update flat page" },
      { status: 500 },
    )
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getServiceRoleSupabase()
    const { id } = await context.params

    const { error } = await supabase.from("flat_pages").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: { id } })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: message || "Failed to delete flat page" },
      { status: 500 },
    )
  }
}
