import { TRPCError } from "@trpc/server"
import { and, desc, eq, ilike, or, sql } from "drizzle-orm"
import { z } from "zod"

import { client, db } from "@/db"
import { centerProfiles } from "@/drizzle/schema"
import { dispatchCenterDecisionNotification } from "@/lib/notifications/center-approval"
import { createTRPCRouter, publicProcedure } from "@/trpc/init"

const centerStatusSchema = z.enum(["submitted", "pending", "active", "deactive", "rejected", "blacklisted"])
const terminalCenterStatusSchema = z.enum(["active", "deactive", "rejected", "blacklisted"])
const terminalCenterStatuses = ["active", "deactive", "rejected", "blacklisted"] as const

function formatDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown database error"
  const anyError = error as Error & {
    code?: string
    detail?: string
    hint?: string
    severity?: string
    position?: string
    where?: string
    routine?: string
    schema_name?: string
    table_name?: string
    column_name?: string
    constraint_name?: string
    cause?: unknown
  }

  const actionableHint = (() => {
    const causeText =
      typeof anyError.cause === "string"
        ? anyError.cause
        : anyError.cause instanceof Error
          ? anyError.cause.message
          : ""

    if (causeText.includes("MaxClientsInSessionMode") || causeText.toLowerCase().includes("max clients reached")) {
      return "DB pooler is out of connections. Reduce Node pool size (set `DB_POOL_SIZE=1`), ensure DB client is singleton, or switch to Supabase Transaction Pooler."
    }

    switch (anyError.code) {
      case "42P01":
      case "42703":
        return "Run database migrations (e.g. `npm run db:migrate`) and ensure you're connected to the correct database."
      case "28P01":
        return "Check DB credentials (DB_USER/DB_PASSWORD)."
      case "3D000":
        return "Check DB_NAME (database does not exist)."
      case "08001":
      case "08006":
        return "Check DB_HOST/DB_PORT connectivity and SSL settings."
      default:
        return null
    }
  })()

  const parts = [
    anyError.code ? `code=${anyError.code}` : null,
    anyError.severity ? `severity=${anyError.severity}` : null,
    anyError.schema_name ? `schema=${anyError.schema_name}` : null,
    anyError.table_name ? `table=${anyError.table_name}` : null,
    anyError.column_name ? `column=${anyError.column_name}` : null,
    anyError.constraint_name ? `constraint=${anyError.constraint_name}` : null,
    anyError.routine ? `routine=${anyError.routine}` : null,
    anyError.position ? `position=${anyError.position}` : null,
  ].filter(Boolean)

  const suffix = parts.length ? ` (${parts.join(", ")})` : ""
  const detail = anyError.detail ? ` Detail: ${anyError.detail}` : ""
  const hint = anyError.hint ? ` Hint: ${anyError.hint}` : ""
  const extraHint = actionableHint ? ` Hint: ${actionableHint}` : ""
  const causeMessage =
    anyError.cause instanceof Error
      ? ` Cause: ${anyError.cause.message}`
      : typeof anyError.cause === "string"
        ? ` Cause: ${anyError.cause}`
        : ""
  const where = anyError.where ? ` Where: ${anyError.where}` : ""

  return `${anyError.message}${suffix}${detail}${hint}${extraHint}${where}${causeMessage}`.trim()
}

function isTerminalCenterStatus(status: z.infer<typeof centerStatusSchema>): status is z.infer<typeof terminalCenterStatusSchema> {
  return (terminalCenterStatuses as readonly string[]).includes(status)
}

const listCentersSchema = z.object({
  status: centerStatusSchema.optional(),
  q: z.string().trim().min(1).optional(),
})

const createCenterSchema = z.object({
  authUserId: z.string().uuid(),
  centerName: z.string().min(2),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(4).optional(),
})

const requestOnboardingSchema = z.object({
  centerName: z.string().min(2),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(4).optional(),
})

const updateCenterStatusSchema = z.object({
  id: z.string().uuid(),
  status: centerStatusSchema,
  approvalNote: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  if (value.status === "rejected" && !value.approvalNote?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["approvalNote"],
      message: "Rejection description is required.",
    })
  }
})

const updateCenterSchema = z.object({
  id: z.string().uuid(),
  centerName: z.string().min(2).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(4).optional(),
  approvalNote: z.string().trim().min(1).optional(),
})

const updateCenterSettingsSchema = z.object({
  id: z.string().uuid(),
  centerName: z.string().trim().optional().nullable(),
  commercialRegistrationNumber: z.string().trim().optional().nullable(),
  shortDescription: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  website: z.string().trim().optional().nullable(),
  officialEmail: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  languageSupported: z.string().trim().optional().nullable(),
  therapistCount: z.number().int().min(0).optional().nullable(),
  centerContactNumber: z.string().trim().optional().nullable(),
  managerName: z.string().trim().optional().nullable(),
  managerEmail: z.string().trim().optional().nullable(),
  managerPhone: z.string().trim().optional().nullable(),
  managerPrimary: z.boolean().optional().nullable(),
  marketingRepName: z.string().trim().optional().nullable(),
  marketingRepEmail: z.string().trim().optional().nullable(),
  marketingRepPhone: z.string().trim().optional().nullable(),
  marketingRepPrimary: z.boolean().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  primaryAccentColor: z.string().trim().optional().nullable(),
})

export const centersRouter = createTRPCRouter({
  list: publicProcedure.input(listCentersSchema.optional()).query(async ({ input }) => {
    try {
      const filters = []

      if (input?.status) filters.push(eq(centerProfiles.approvalStatus, input.status))
      if (input?.q) {
        const term = `%${input.q.toLowerCase()}%`
        filters.push(
          or(
            ilike(centerProfiles.centerName, term),
            ilike(centerProfiles.contactEmail, term),
            ilike(centerProfiles.contactPhone, term),
          ),
        )
      }

      const data = await db
        .select()
        .from(centerProfiles)
        .where(filters.length ? and(...filters) : undefined)
        .orderBy(desc(centerProfiles.createdAt))

      return { data }
    } catch (error) {
      console.error("centers.list query failed", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to load centers. ${formatDatabaseError(error)}`,
      })
    }
  }),

  byId: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ input }) => {
    try {
      const center = await db.select().from(centerProfiles).where(eq(centerProfiles.id, input.id)).limit(1)
      if (center.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Center not found" })
      }

      const authUserId = center[0].authUserId
      const centerUserId = center[0].userId

      type CenterSettingsRow = {
        center_name: string | null
        commercial_registration_number: string | null
        short_description: string | null
        location: string | null
        website: string | null
        official_email: string | null
        phone_number: string | null
        address: string | null
        logo_url: string | null
        primary_accent_color: string | null
        language_supported: string | null
        therapist_count: number | null
        center_contact_number: string | null
        manager_name: string | null
        manager_email: string | null
        manager_phone: string | null
        manager_primary: boolean | null
        marketing_rep_name: string | null
        marketing_rep_email: string | null
        marketing_rep_phone: string | null
        marketing_rep_primary: boolean | null
      }

      type DepartmentRow = {
        id: string
        name: string
        description: string | null
        status: string | null
        updated_at: string | null
      }

      type ServiceRow = {
        id: string
        service_name: string
        description: string | null
        status: string | null
        department_id: string | null
        department_name: string | null
      }

      type SpecialistRow = {
        id: string
        name: string
        designation: string
        department: string | null
        years_of_experience: number | null
        created_at: string
      }

      type SpecialistAttachment = {
        name: string
        type: string
        dataUrl: string
      }

      type SpecialistEducationRow = {
        specialist_id: string
        degree: string
        university: string
        from_date: string
        to_date: string | null
        certificates: SpecialistAttachment[] | null
      }

      type SpecialistExperienceRow = {
        specialist_id: string
        title: string
        organization: string
        from_date: string
        to_date: string | null
        certificates: SpecialistAttachment[] | null
      }

      type ClientReferralRequestRow = {
        id: string
        customer_name: string | null
        customer_email: string | null
        customer_phone: string | null
        note: string | null
        status: "pending" | "approved" | "rejected"
        referral_code: string | null
        rejection_note: string | null
        decided_at: string | null
        created_at: string
        updated_at: string
      }

      const [
        settingsRows,
        departmentRows,
        serviceRows,
        specialistRows,
        educationRows,
        experienceRows,
        referralRequestRows,
      ] = await Promise.all([
        client<CenterSettingsRow[]>`
        select
          center_name,
          commercial_registration_number,
          short_description,
          location,
          website,
          official_email,
          phone_number,
          address,
          logo_url,
          primary_accent_color,
          language_supported,
          therapist_count,
          center_contact_number,
          manager_name,
          manager_email,
          manager_phone,
          manager_primary,
          marketing_rep_name,
          marketing_rep_email,
          marketing_rep_phone,
          marketing_rep_primary
        from center_settings
        where auth_user_id = ${authUserId}
        limit 1
      `,
      client<DepartmentRow[]>`
        select id, name, description, status, updated_at
        from departments
        where auth_user_id = ${authUserId}
        order by name asc
      `,
      client<ServiceRow[]>`
        select
          s.id,
          s.service_name,
          s.description,
          s.status,
          s.department_id,
          d.name as department_name
        from services s
        left join departments d on d.id = s.department_id
        where s.auth_user_id = ${authUserId}
        order by s.service_name asc
      `,
      client<SpecialistRow[]>`
        select
          id,
          name,
          designation,
          department,
          years_of_experience,
          created_at
        from specialists
        where created_by = ${authUserId}
        order by created_at desc
      `,
      client<SpecialistEducationRow[]>`
        select
          e.specialist_id,
          e.degree,
          e.university,
          e.from_date,
          e.to_date,
          e.certificates
        from specialist_educations e
        join specialists s on s.id = e.specialist_id
        where s.created_by = ${authUserId}
        order by e.from_date desc
      `,
      client<SpecialistExperienceRow[]>`
        select
          x.specialist_id,
          x.title,
          x.organization,
          x.from_date,
          x.to_date,
          x.certificates
        from specialist_experiences x
        join specialists s on s.id = x.specialist_id
        where s.created_by = ${authUserId}
        order by x.from_date desc
      `,
      centerUserId
        ? client<ClientReferralRequestRow[]>`
        select
          id,
          customer_name,
          customer_email,
          customer_phone,
          note,
          status,
          referral_code,
          rejection_note,
          decided_at,
          created_at,
          updated_at
        from client_referral_requests
        where center_user_id = ${centerUserId}
        order by created_at desc
      `
        : Promise.resolve([] as ClientReferralRequestRow[]),
      ])

      const settings = settingsRows[0] ?? null
      const languageSupported = settings?.language_supported ?? ""
      const languages = languageSupported
        ? languageSupported
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : []

      const onboarding = {
        basicInfo: {
          centerName: settings?.center_name ?? null,
          shortDescription: settings?.short_description ?? null,
          location: settings?.location ?? null,
          commercialRegistrationNumber: settings?.commercial_registration_number ?? null,
          website: settings?.website ?? null,
          officialEmail: settings?.official_email ?? null,
          phoneNumber: settings?.phone_number ?? null,
          address: settings?.address ?? null,
        },
        operations: {
          languageSupported: languages,
          therapistCount: settings?.therapist_count ?? null,
          centerContactNumber: settings?.center_contact_number ?? null,
          managerName: settings?.manager_name ?? null,
          managerEmail: settings?.manager_email ?? null,
          managerPhone: settings?.manager_phone ?? null,
          managerPrimary: settings?.manager_primary ?? null,
          marketingRepName: settings?.marketing_rep_name ?? null,
          marketingRepEmail: settings?.marketing_rep_email ?? null,
          marketingRepPhone: settings?.marketing_rep_phone ?? null,
          marketingRepPrimary: settings?.marketing_rep_primary ?? null,
        },
        customize: {
          logoUrl: settings?.logo_url ?? null,
          primaryAccentColor: settings?.primary_accent_color ?? null,
        },
        departments: departmentRows.map((department) => ({
          id: department.id,
          name: department.name,
          description: department.description,
          status: department.status,
          updatedAt: department.updated_at,
        })),
        services: serviceRows.map((service) => ({
          id: service.id,
          serviceName: service.service_name,
          description: service.description,
          status: service.status,
          departmentId: service.department_id,
          departmentName: service.department_name,
        })),
        specialists: specialistRows.map((specialist) => ({
          id: specialist.id,
          name: specialist.name,
          designation: specialist.designation,
          department: specialist.department,
          yearsOfExperience: specialist.years_of_experience,
          createdAt: specialist.created_at,
          education: educationRows
            .filter((row) => row.specialist_id === specialist.id)
            .map((row) => ({
              degree: row.degree,
              university: row.university,
              fromDate: row.from_date,
              toDate: row.to_date,
              certificates: row.certificates ?? [],
            })),
          experience: experienceRows
            .filter((row) => row.specialist_id === specialist.id)
            .map((row) => ({
              title: row.title,
              organization: row.organization,
              fromDate: row.from_date,
              toDate: row.to_date,
              certificates: row.certificates ?? [],
            })),
        })),
      }

      const clientRequests = referralRequestRows.map((request) => ({
        id: request.id,
        customerName: request.customer_name,
        customerEmail: request.customer_email,
        customerPhone: request.customer_phone,
        note: request.note,
        status: request.status,
        referralCode: request.referral_code,
        rejectionNote: request.rejection_note,
        decidedAt: request.decided_at,
        createdAt: request.created_at,
        updatedAt: request.updated_at,
      }))

      return { data: { ...center[0], onboarding, clientRequests } }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      console.error("centers.byId query failed", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to load center. ${formatDatabaseError(error)}`,
      })
    }
  }),

  myProfile: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
    }

    const center = await db
      .select()
      .from(centerProfiles)
      .where(eq(centerProfiles.authUserId, ctx.user.id))
      .limit(1)

    if (center.length === 0) {
      return { data: null }
    }

    return { data: center[0] }
  }),

  create: publicProcedure.input(createCenterSchema).mutation(async ({ input }) => {
    const [created] = await db
      .insert(centerProfiles)
      .values({
        authUserId: input.authUserId,
        centerName: input.centerName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone,
        approvalStatus: "submitted",
      })
      .returning()

    return { data: created }
  }),

  requestOnboarding: publicProcedure
    .input(requestOnboardingSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" })
      }

      const [created] = await db
        .insert(centerProfiles)
        .values({
          authUserId: ctx.user.id,
          centerName: input.centerName,
          contactEmail: input.contactEmail,
          contactPhone: input.contactPhone,
          approvalStatus: "submitted",
          decidedAt: null,
          approvalNote: null,
        })
        .onConflictDoUpdate({
          target: centerProfiles.authUserId,
          set: {
            centerName: input.centerName,
            contactEmail: input.contactEmail,
            contactPhone: input.contactPhone,
            approvalStatus: "submitted",
            decidedAt: null,
            approvalNote: null,
          },
        })
        .returning()

      return { data: created }
    }),

  updateStatus: publicProcedure.input(updateCenterStatusSchema).mutation(async ({ input }) => {
    const existing = await db
      .select({ approvalStatus: centerProfiles.approvalStatus })
      .from(centerProfiles)
      .where(eq(centerProfiles.id, input.id))
      .limit(1)

    if (existing.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Center not found" })
    }

    const nowIso = new Date().toISOString()
    const updateValues: Record<string, unknown> = {
      approvalStatus: input.status,
      updatedAt: nowIso,
    }

    const terminalStatus = isTerminalCenterStatus(input.status) ? input.status : null

    if (terminalStatus) {
      updateValues.decidedAt = nowIso
    } else {
      updateValues.decidedAt = null
    }

    updateValues.approvalNote = input.status === "rejected" ? input.approvalNote?.trim() || null : null

    const [updated] = await db
      .update(centerProfiles)
      .set(updateValues)
      .where(eq(centerProfiles.id, input.id))
      .returning()

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Center not found" })
    }

    const previousStatus = existing[0].approvalStatus

    if (terminalStatus && previousStatus !== terminalStatus) {
      const notificationResult = await dispatchCenterDecisionNotification({
        centerId: updated.id,
        authUserId: updated.authUserId,
        centerName: updated.centerName,
        contactEmail: updated.contactEmail,
        status: terminalStatus,
        approvalNote: updated.approvalNote,
        decidedAt: updated.decidedAt,
      })

      if (!notificationResult.dispatched) {
        console.warn(
          `[centers.updateStatus] notification dispatch failed for ${updated.id}: ${notificationResult.reason ?? "unknown reason"}`,
        )
      }
    }

    return { data: updated }
  }),

  update: publicProcedure.input(updateCenterSchema).mutation(async ({ input }) => {
    try {
      const updateValues: Partial<typeof centerProfiles.$inferInsert> = {
        updatedAt: new Date().toISOString(),
      }

      if (input.centerName !== undefined) updateValues.centerName = input.centerName
      if (input.contactEmail !== undefined) updateValues.contactEmail = input.contactEmail
      if (input.contactPhone !== undefined) updateValues.contactPhone = input.contactPhone
      if (input.approvalNote !== undefined) updateValues.approvalNote = input.approvalNote

      if (Object.keys(updateValues).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No updates provided" })
      }

      const [updated] = await db
        .update(centerProfiles)
        .set(updateValues)
        .where(eq(centerProfiles.id, input.id))
        .returning()

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Center not found" })
      }

      return { data: updated }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      console.error("centers.update mutation failed", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to update center. ${formatDatabaseError(error)}`,
      })
    }
  }),

  updateSettings: publicProcedure.input(updateCenterSettingsSchema).mutation(async ({ input }) => {
    try {
      const center = await db.select().from(centerProfiles).where(eq(centerProfiles.id, input.id)).limit(1)
      if (center.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Center not found" })
      }

      const authUserId = center[0].authUserId

      const normalizeText = (value: string | null | undefined) => {
        if (value === null) return null
        if (value === undefined) return undefined
        const trimmed = value.trim()
        return trimmed.length ? trimmed : null
      }

      const centerName = normalizeText(input.centerName)
      const commercialRegistrationNumber = normalizeText(input.commercialRegistrationNumber)
      const shortDescription = normalizeText(input.shortDescription)
      const location = normalizeText(input.location)
      const website = normalizeText(input.website)
      const officialEmail = normalizeText(input.officialEmail)
      const phoneNumber = normalizeText(input.phoneNumber)
      const address = normalizeText(input.address)
      const languageSupported = normalizeText(input.languageSupported)
      const centerContactNumber = normalizeText(input.centerContactNumber)
      const managerName = normalizeText(input.managerName)
      const managerEmail = normalizeText(input.managerEmail)
      const managerPhone = normalizeText(input.managerPhone)
      const marketingRepName = normalizeText(input.marketingRepName)
      const marketingRepEmail = normalizeText(input.marketingRepEmail)
      const marketingRepPhone = normalizeText(input.marketingRepPhone)
      const logoUrl = normalizeText(input.logoUrl)
      const primaryAccentColor = normalizeText(input.primaryAccentColor)

      const therapistCount = input.therapistCount === undefined ? undefined : input.therapistCount ?? null
      const managerPrimary = input.managerPrimary === undefined ? undefined : input.managerPrimary ?? null
      const marketingRepPrimary = input.marketingRepPrimary === undefined ? undefined : input.marketingRepPrimary ?? null

      const existingRows = await client<
        Array<{
          center_name: string | null
          commercial_registration_number: string | null
          short_description: string | null
          location: string | null
          website: string | null
          official_email: string | null
          phone_number: string | null
          address: string | null
          language_supported: string | null
          therapist_count: number | null
          center_contact_number: string | null
          manager_name: string | null
          manager_email: string | null
          manager_phone: string | null
          manager_primary: boolean | null
          marketing_rep_name: string | null
          marketing_rep_email: string | null
          marketing_rep_phone: string | null
          marketing_rep_primary: boolean | null
          logo_url: string | null
          primary_accent_color: string | null
        }>
      >`
        select
          center_name,
          commercial_registration_number,
          short_description,
          location,
          website,
          official_email,
          phone_number,
          address,
          language_supported,
          therapist_count,
          center_contact_number,
          manager_name,
          manager_email,
          manager_phone,
          manager_primary,
          marketing_rep_name,
          marketing_rep_email,
          marketing_rep_phone,
          marketing_rep_primary,
          logo_url,
          primary_accent_color
        from center_settings
        where auth_user_id = ${authUserId}
        limit 1
      `

      const existing = existingRows[0] ?? null

      const patch = {
        center_name: centerName === undefined ? existing?.center_name ?? null : centerName,
        commercial_registration_number:
          commercialRegistrationNumber === undefined
            ? existing?.commercial_registration_number ?? null
            : commercialRegistrationNumber,
        short_description: shortDescription === undefined ? existing?.short_description ?? null : shortDescription,
        location: location === undefined ? existing?.location ?? null : location,
        website: website === undefined ? existing?.website ?? null : website,
        official_email: officialEmail === undefined ? existing?.official_email ?? null : officialEmail,
        phone_number: phoneNumber === undefined ? existing?.phone_number ?? null : phoneNumber,
        address: address === undefined ? existing?.address ?? null : address,
        language_supported: languageSupported === undefined ? existing?.language_supported ?? null : languageSupported,
        therapist_count:
          therapistCount === undefined ? existing?.therapist_count ?? 0 : therapistCount ?? existing?.therapist_count ?? 0,
        center_contact_number:
          centerContactNumber === undefined ? existing?.center_contact_number ?? null : centerContactNumber,
        manager_name: managerName === undefined ? existing?.manager_name ?? null : managerName,
        manager_email: managerEmail === undefined ? existing?.manager_email ?? null : managerEmail,
        manager_phone: managerPhone === undefined ? existing?.manager_phone ?? null : managerPhone,
        manager_primary:
          managerPrimary === undefined ? existing?.manager_primary ?? true : managerPrimary ?? existing?.manager_primary ?? true,
        marketing_rep_name: marketingRepName === undefined ? existing?.marketing_rep_name ?? null : marketingRepName,
        marketing_rep_email: marketingRepEmail === undefined ? existing?.marketing_rep_email ?? null : marketingRepEmail,
        marketing_rep_phone: marketingRepPhone === undefined ? existing?.marketing_rep_phone ?? null : marketingRepPhone,
        marketing_rep_primary:
          marketingRepPrimary === undefined
            ? existing?.marketing_rep_primary ?? false
            : marketingRepPrimary ?? existing?.marketing_rep_primary ?? false,
        logo_url: logoUrl === undefined ? existing?.logo_url ?? null : logoUrl,
        primary_accent_color:
          primaryAccentColor === undefined ? existing?.primary_accent_color ?? "#ABBA30" : primaryAccentColor ?? "#ABBA30",
      }

      await client`
        insert into center_settings (
          auth_user_id,
          center_name,
          commercial_registration_number,
          short_description,
          location,
          website,
          official_email,
          phone_number,
          address,
          language_supported,
          therapist_count,
          center_contact_number,
          manager_name,
          manager_email,
          manager_phone,
          manager_primary,
          marketing_rep_name,
          marketing_rep_email,
          marketing_rep_phone,
          marketing_rep_primary,
          logo_url,
          primary_accent_color,
          updated_at
        ) values (
          ${authUserId},
          ${patch.center_name},
          ${patch.commercial_registration_number},
          ${patch.short_description},
          ${patch.location},
          ${patch.website},
          ${patch.official_email},
          ${patch.phone_number},
          ${patch.address},
          ${patch.language_supported},
          ${patch.therapist_count},
          ${patch.center_contact_number},
          ${patch.manager_name},
          ${patch.manager_email},
          ${patch.manager_phone},
          ${patch.manager_primary},
          ${patch.marketing_rep_name},
          ${patch.marketing_rep_email},
          ${patch.marketing_rep_phone},
          ${patch.marketing_rep_primary},
          ${patch.logo_url},
          ${patch.primary_accent_color},
          now()
        )
        on conflict (auth_user_id) do update set
          center_name = excluded.center_name,
          commercial_registration_number = excluded.commercial_registration_number,
          short_description = excluded.short_description,
          location = excluded.location,
          website = excluded.website,
          official_email = excluded.official_email,
          phone_number = excluded.phone_number,
          address = excluded.address,
          language_supported = excluded.language_supported,
          therapist_count = excluded.therapist_count,
          center_contact_number = excluded.center_contact_number,
          manager_name = excluded.manager_name,
          manager_email = excluded.manager_email,
          manager_phone = excluded.manager_phone,
          manager_primary = excluded.manager_primary,
          marketing_rep_name = excluded.marketing_rep_name,
          marketing_rep_email = excluded.marketing_rep_email,
          marketing_rep_phone = excluded.marketing_rep_phone,
          marketing_rep_primary = excluded.marketing_rep_primary,
          logo_url = excluded.logo_url,
          primary_accent_color = excluded.primary_accent_color,
          updated_at = now()
      `

      if (centerName && centerName !== center[0].centerName) {
        await db
          .update(centerProfiles)
          .set({ centerName, updatedAt: new Date().toISOString() })
          .where(eq(centerProfiles.id, input.id))
      }

      return { success: true }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      console.error("centers.updateSettings mutation failed", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to update center settings. ${formatDatabaseError(error)}`,
      })
    }
  }),

  remove: publicProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
    try {
      const [deleted] = await db.delete(centerProfiles).where(eq(centerProfiles.id, input.id)).returning()
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Center not found" })
      }
      return { data: deleted }
    } catch (error) {
      if (error instanceof TRPCError) throw error
      console.error("centers.remove mutation failed", error)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to remove center. ${formatDatabaseError(error)}`,
      })
    }
  }),
})
