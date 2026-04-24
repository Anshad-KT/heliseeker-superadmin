import { readFile } from "node:fs/promises"
import path from "node:path"

import { createClient } from "@supabase/supabase-js"

type FlatPageJson = {
  title?: unknown
  slug?: unknown
  description?: unknown
  enabled?: unknown
  updatedAt?: unknown
}

type AdminPanelJson = {
  flatPages?: unknown
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "")
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE

  if (!supabaseUrl) {
    throw new Error("Missing required env: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)")
  }
  if (!serviceRoleKey) {
    throw new Error("Missing required env: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)")
  }

  const projectRoot = process.cwd()
  const dataFile =
    process.env.ADMIN_PANEL_JSON_FILE?.trim() ||
    path.join(projectRoot, "data", "admin-panel.json")

  const raw = await readFile(dataFile, "utf8")
  const parsed = JSON.parse(raw) as AdminPanelJson
  const flatPagesRaw = parsed.flatPages

  if (!Array.isArray(flatPagesRaw)) {
    throw new Error(`No flatPages[] found in ${dataFile}`)
  }

  const rows = (flatPagesRaw as FlatPageJson[])
    .map((page) => ({
      title: asString(page.title).trim(),
      slug: asString(page.slug).trim(),
      description: asString(page.description),
      enabled: typeof page.enabled === "boolean" ? page.enabled : true,
      updated_at:
        typeof page.updatedAt === "string" && page.updatedAt.trim()
          ? page.updatedAt.trim()
          : new Date().toISOString(),
    }))
    .filter((row) => row.title && row.slug)

  if (rows.length === 0) {
    console.log("No valid flat pages to migrate.")
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Requires unique index on `slug` (created by migration).
  const { data, error } = await supabase
    .from("flat_pages")
    .upsert(rows, { onConflict: "slug" })
    .select("id,slug")

  if (error) throw new Error(error.message)

  console.log(`Migrated ${rows.length} flat pages into flat_pages.`)
  console.log(`Upserted rows: ${Array.isArray(data) ? data.length : 0}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

