import { NextRequest, NextResponse } from "next/server"

import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"
import type { FlatPage } from "@/lib/admin-panel/types"
import { normalizeFlatPageHtml } from "./_lib/flat-page-html"

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

export async function GET() {
  try {
    const supabase = getServiceRoleSupabase()
    const { data, error } = await supabase
      .from("flat_pages")
      .select("id,title,slug,description,enabled,updated_at")
      .order("title", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const pages = Array.isArray(data) ? (data as FlatPageRow[]).map(toFlatPage) : []
    return NextResponse.json({ data: pages })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/No suitable key or wrong key type/i.test(message)) {
      return NextResponse.json(
        {
          error:
            "Server misconfigured: invalid NEXT_SERVER_ACTIONS_ENCRYPTION_KEY. Set it to a base64-encoded 32-byte value and restart the dev server.",
        },
        { status: 500 },
      )
    }
    return NextResponse.json(
      { error: message || "Failed to load flat pages" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceRoleSupabase()
    const payload = (await request.json()) as {
      title: string
      slug: string
      description: string
    }

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from("flat_pages")
      .insert([
        {
          title: payload.title,
          slug: payload.slug,
          description: normalizeFlatPageHtml(payload.title, payload.description),
          enabled: true,
          updated_at: now,
        },
      ])
      .select("id,title,slug,description,enabled,updated_at")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data: toFlatPage(data as FlatPageRow) }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: message || "Failed to create flat page" },
      { status: 500 },
    )
  }
}
