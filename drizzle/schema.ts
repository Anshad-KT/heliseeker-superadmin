import { boolean, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const centerApprovalStatus = pgEnum("center_approval_status", [
  "submitted",
  "pending",
  "active",
  "deactive",
  "rejected",
  "blacklisted",
])

export const centerProfiles = pgTable("center_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  authUserId: uuid("auth_user_id").notNull(),
  userId: uuid("user_id"),
  centerName: text("center_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  approvalStatus: centerApprovalStatus("approval_status").notNull().default("submitted"),
  approvalNote: text("approval_note"),
  decidedAt: timestamp("decided_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
})

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message"),
  source: text("source"),
  pageUrl: text("page_url"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
})

export const admins = pgTable("admins", {
  adminId: uuid("admin_id").defaultRandom().primaryKey(),
  authUserId: uuid("auth_user_id"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 50 }).notNull().default("super_admin"),
  img: text("img"),
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
})

export const roles = pgTable("roles", {
  roleId: uuid("role_id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`),
})

export const permissions = pgTable("permissions", {
  permissionId: uuid("permission_id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  permissionName: text("permission_name").notNull().unique(),
})

export const modules = pgTable("modules", {
  moduleId: uuid("module_id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  moduleName: text("module_name").notNull().unique(),
  moduleParent: text("module_parent"),
  link: text("link"),
  moduleNameLabel: text("module_name_label"),
  moduleParentLabel: text("module_parent_label"),
})

export const flatPages = pgTable(
  "flat_pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    slugUnique: uniqueIndex("flat_pages_slug_unique").on(table.slug),
  }),
)

// Legacy boolean-based table retained for migration/backfill.
export const rolePermissionsLegacy = pgTable(
  "role_permissions_legacy",
  {
    permissionId: uuid("permission_id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId, { onDelete: "cascade" }),
    module: text("module").notNull(),
    canView: boolean("can_view").notNull().default(false),
    canCreate: boolean("can_create").notNull().default(false),
    canEdit: boolean("can_edit").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => sql`now()`),
  },
  (table) => ({
    roleModuleUnique: uniqueIndex("role_permissions_legacy_role_module_unique").on(table.roleId, table.module),
  }),
)

export const rolePermissions = pgTable(
  "role_permissions",
  {
    rolePermissionId: uuid("role_permission_id").defaultRandom().primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.roleId, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.permissionId, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.moduleId, { onDelete: "cascade" }),
  },
  (table) => ({
    uniqueTriplet: uniqueIndex("role_permissions_unique_triplet").on(table.roleId, table.moduleId, table.permissionId),
  }),
)

export type Admin = typeof admins.$inferSelect
export type NewAdmin = typeof admins.$inferInsert
export type CenterProfile = typeof centerProfiles.$inferSelect
export type NewCenterProfile = typeof centerProfiles.$inferInsert
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert
export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert
export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert
export type Module = typeof modules.$inferSelect
export type NewModule = typeof modules.$inferInsert
export type RolePermissionLegacy = typeof rolePermissionsLegacy.$inferSelect
export type NewRolePermissionLegacy = typeof rolePermissionsLegacy.$inferInsert
export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert

export type FlatPage = typeof flatPages.$inferSelect
export type NewFlatPage = typeof flatPages.$inferInsert
