import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { defaultAdminDb } from "./default-data"
import { AdminPanelDb } from "./types"

let resolvedDataFile: string | null = null

function getDataFile(): string {
  if (resolvedDataFile) return resolvedDataFile

  const configured = process.env.ADMIN_PANEL_DATA_FILE?.trim()
  if (configured) {
    resolvedDataFile = configured
    return resolvedDataFile
  }

  const candidates = [
    path.join(process.cwd(), "data", "admin-panel.json"),
    // Monorepo fallback (when the Vercel project root is the repo root).
    path.join(process.cwd(), "heli-seeker-superadmin", "data", "admin-panel.json"),
  ]

  resolvedDataFile = candidates.find((candidate) => existsSync(candidate)) ?? candidates[0]
  return resolvedDataFile
}

async function ensureDataFile() {
  const dataFile = getDataFile()
  const dataDir = path.dirname(dataFile)

  try {
    await mkdir(dataDir, { recursive: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Admin panel storage is not writable. Failed to create data directory at "${dataDir}". ` +
        `Set ADMIN_PANEL_DATA_FILE to a writable, persistent location. Original error: ${message}`,
    )
  }

  const legacyDataFile = path.join(process.cwd(), "data", "admin-panel.json")
  try {
    await readFile(dataFile, "utf8")
  } catch {
    if (legacyDataFile !== dataFile) {
      try {
        const legacyRaw = await readFile(legacyDataFile, "utf8")
        try {
          await writeFile(dataFile, legacyRaw, "utf8")
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          throw new Error(
            `Admin panel storage is not writable. Failed to copy legacy data into "${dataFile}". ` +
              `Set ADMIN_PANEL_DATA_FILE to a writable, persistent location. Original error: ${message}`,
          )
        }
        return
      } catch {
        // ignore legacy fallback
      }
    }
    try {
      await writeFile(dataFile, JSON.stringify(defaultAdminDb, null, 2), "utf8")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Admin panel storage is not writable. Failed to initialize "${dataFile}". ` +
          `Set ADMIN_PANEL_DATA_FILE to a writable, persistent location. Original error: ${message}`,
      )
    }
  }
}

export async function readDb(): Promise<AdminPanelDb> {
  await ensureDataFile()
  const dataFile = getDataFile()
  const raw = await readFile(dataFile, "utf8")
  const parsed = (() => {
    try {
      return JSON.parse(raw) as Partial<AdminPanelDb>
    } catch {
      return {}
    }
  })()
  return {
    ...defaultAdminDb,
    ...parsed,
    seo: {
      ...defaultAdminDb.seo,
      ...(parsed.seo ?? {}),
    },
    tags: parsed.tags ?? defaultAdminDb.tags,
    centers: parsed.centers ?? defaultAdminDb.centers,
    patients: parsed.patients ?? defaultAdminDb.patients,
    searchFilters: parsed.searchFilters ?? defaultAdminDb.searchFilters,
    roles: parsed.roles ?? defaultAdminDb.roles,
    staffUsers: parsed.staffUsers ?? defaultAdminDb.staffUsers,
    flatPages: parsed.flatPages ?? defaultAdminDb.flatPages,
  }
}

export async function writeDb(next: AdminPanelDb): Promise<void> {
  await ensureDataFile()
  const dataFile = getDataFile()
  await writeFile(dataFile, JSON.stringify(next, null, 2), "utf8")
}

export async function updateDb(updater: (current: AdminPanelDb) => AdminPanelDb | Promise<AdminPanelDb>): Promise<AdminPanelDb> {
  const current = await readDb()
  const next = await updater(current)
  await writeDb(next)
  return next
}

export function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
