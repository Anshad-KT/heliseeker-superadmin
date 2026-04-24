import { pgTable, foreignKey, unique, pgPolicy, uuid, text, timestamp, boolean, index, uniqueIndex, check, date, integer, varchar, jsonb, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const centerApprovalStatus = pgEnum("center_approval_status", ['pending', 'active', 'deactive', 'rejected', 'blacklisted', 'submitted'])
export const departmentStatus = pgEnum("department_status", ['active', 'inactive'])
export const referralRequestStatus = pgEnum("referral_request_status", ['pending', 'approved', 'rejected'])
export const userType = pgEnum("user_type", ['customer', 'center', 'admin'])


export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id"),
	email: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userType: userType("user_type").default('customer').notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	isSocialSignin: boolean("is_social_signin").default(false).notNull(),
	isSignedupCenter: boolean("is_signedup_center").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [table.id],
			name: "users_auth_user_id_fkey"
		}).onDelete("cascade"),
	unique("users_auth_user_id_key").on(table.authUserId),
	pgPolicy("Admins can manage users", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Public can view center users", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("Users can insert own row", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Users can update own profile", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can update own row", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Users can view own profile", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can view own row", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const specialists = pgTable("specialists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	phoneNumber: text("phone_number").notNull(),
	gender: text().notNull(),
	dob: date(),
	yearsOfExperience: integer("years_of_experience"),
	departmentId: uuid("department_id"),
	designation: text().notNull(),
	medicalLicenseNumber: text("medical_license_number").notNull(),
	licenseIssuedBy: text("license_issued_by"),
	profileImage: text("profile_image"),
	bio: text(),
	featureOnWebsite: boolean("feature_on_website").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	department: text(),
	createdBy: uuid("created_by"),
}, (table) => [
	index("idx_specialists_created_by").using("btree", table.createdBy.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("specialists_created_by_email_key").using("btree", table.createdBy.asc().nullsLast().op("text_ops"), table.email.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "specialists_created_by_fkey"
		}).onDelete("cascade"),
	pgPolicy("Public can view featured specialists", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((feature_on_website = true) AND (EXISTS ( SELECT 1
   FROM center_profiles cp
  WHERE ((cp.auth_user_id = specialists.created_by) AND (cp.approval_status = 'active'::center_approval_status)))))` }),
	pgPolicy("specialists_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
	check("specialists_gender_check", sql`gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])`),
	check("specialists_years_of_experience_check", sql`years_of_experience >= 0`),
]);

export const centerWorkingHours = pgTable("center_working_hours", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id").notNull(),
	dayName: text("day_name").notNull(),
	shiftIndex: integer("shift_index").notNull(),
	startTime: text("start_time"),
	endTime: text("end_time"),
	notWorking: boolean("not_working").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_center_working_hours_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_center_working_hours_day_name").using("btree", table.dayName.asc().nullsLast().op("text_ops")),
	unique("center_working_hours_auth_user_id_day_name_shift_index_key").on(table.authUserId, table.dayName, table.shiftIndex),
	pgPolicy("center_working_hours_manage_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(is_center() AND (auth.uid() = auth_user_id))`, withCheck: sql`(is_center() AND (auth.uid() = auth_user_id))`  }),
	check("center_working_hours_day_name_check", sql`day_name = ANY (ARRAY['Sunday'::text, 'Monday'::text, 'Tuesday'::text, 'Wednesday'::text, 'Thursday'::text, 'Friday'::text, 'Saturday'::text])`),
	check("center_working_hours_shift_index_check", sql`(shift_index >= 0) AND (shift_index <= 2)`),
]);

export const admins = pgTable("admins", {
	adminId: uuid("admin_id").defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id"),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('super_admin').notNull(),
	img: text(),
	isActive: boolean("is_active").default(true).notNull(),
	lastLoginAt: timestamp("last_login_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("admins_email_unique").on(table.email),
	pgPolicy("admins_manage_admins", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const centerSettings = pgTable("center_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id").notNull(),
	centerName: text("center_name"),
	commercialRegistrationNumber: text("commercial_registration_number"),
	shortDescription: text("short_description"),
	location: text(),
	website: text(),
	officialEmail: text("official_email"),
	phoneNumber: text("phone_number"),
	address: text(),
	logoUrl: text("logo_url"),
	primaryAccentColor: text("primary_accent_color").default('#ABBA30').notNull(),
	languageSupported: text("language_supported"),
	therapistCount: integer("therapist_count").default(0).notNull(),
	centerContactNumber: text("center_contact_number"),
	managerName: text("manager_name"),
	managerEmail: text("manager_email"),
	managerPhone: text("manager_phone"),
	managerPrimary: boolean("manager_primary").default(true).notNull(),
	marketingRepName: text("marketing_rep_name"),
	marketingRepEmail: text("marketing_rep_email"),
	marketingRepPhone: text("marketing_rep_phone"),
	marketingRepPrimary: boolean("marketing_rep_primary").default(false).notNull(),
	workingHours: jsonb("working_hours"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	seoMetaTitle: text("seo_meta_title"),
	seoMetaDescription: text("seo_meta_description"),
	seoOgImageUrl: text("seo_og_image_url"),
}, (table) => [
	unique("center_settings_auth_user_id_key").on(table.authUserId),
	pgPolicy("Public can view center settings", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM center_profiles cp
  WHERE ((cp.auth_user_id = center_settings.auth_user_id) AND (cp.approval_status = 'active'::center_approval_status))))` }),
	pgPolicy("center_settings_admin_manage", { as: "permissive", for: "all", to: ["authenticated"] }),
	pgPolicy("center_settings_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const departments = pgTable("departments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	status: departmentStatus().default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	uniqueIndex("departments_auth_user_id_name_key").using("btree", table.authUserId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("idx_departments_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "departments_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admin full access", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() IN ( SELECT users.auth_user_id
   FROM users
  WHERE (users.user_type = 'admin'::user_type)))` }),
	pgPolicy("Public can view departments", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("Public read departments", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("departments_admin_manage", { as: "permissive", for: "all", to: ["authenticated"] }),
	pgPolicy("departments_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const customerProfiles = pgTable("customer_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id").notNull(),
	userId: uuid("user_id"),
	guardianName: text("guardian_name"),
	countryOfResidency: text("country_of_residency"),
	phoneNumber: text("phone_number"),
	nationality: text(),
	childName: text("child_name"),
	childDob: date("child_dob"),
	primaryLanguage: text("primary_language"),
	specialistEducationalInformation: jsonb("specialist_educational_information").default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isSignedupWebsite: boolean("is_signedup_website").default(false).notNull(),
}, (table) => [
	index("idx_customer_profiles_signedup_website").using("btree", table.isSignedupWebsite.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "customer_profiles_auth_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "customer_profiles_user_id_fkey"
		}).onDelete("set null"),
	unique("customer_profiles_auth_user_id_key").on(table.authUserId),
	pgPolicy("Customer full access", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = auth_user_id)`, withCheck: sql`(auth.uid() = auth_user_id)`  }),
	pgPolicy("Customer profiles can insert own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Customer profiles can update own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("Customer profiles can view own", { as: "permissive", for: "select", to: ["authenticated"] }),
]);

export const ageGroups = pgTable("age_groups", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	authUserId: uuid("auth_user_id"),
	fromAge: integer("from_age"),
	toAge: integer("to_age"),
	unit: text(),
	status: boolean().default(true).notNull(),
}, (table) => [
	uniqueIndex("age_groups_auth_user_id_name_key").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops"), table.name.asc().nullsLast().op("text_ops")),
	index("idx_age_groups_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_age_groups_status").using("btree", table.status.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "age_groups_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admins can manage age_groups", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Public can view age groups", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("age_groups_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
	check("age_groups_unit_check", sql`(unit = ANY (ARRAY['month'::text, 'year'::text])) OR (unit IS NULL)`),
]);

export const centerProfiles = pgTable("center_profiles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	authUserId: uuid("auth_user_id").notNull(),
	userId: uuid("user_id"),
	centerName: text("center_name").notNull(),
	contactEmail: text("contact_email"),
	contactPhone: text("contact_phone"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	approvalStatus: centerApprovalStatus("approval_status").default('pending').notNull(),
	approvalNote: text("approval_note"),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("idx_center_profiles_approval_status").using("btree", table.approvalStatus.asc().nullsLast().op("enum_ops")),
	index("idx_center_profiles_contact_email").using("btree", sql`lower(contact_email)`),
	index("idx_center_profiles_contact_phone").using("btree", table.contactPhone.asc().nullsLast().op("text_ops")),
	index("idx_center_profiles_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "center_profiles_auth_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "center_profiles_user_id_fkey"
		}).onDelete("set null"),
	unique("center_profiles_auth_user_id_key").on(table.authUserId),
	pgPolicy("Center full access", { as: "permissive", for: "all", to: ["public"], using: sql`(auth.uid() = auth_user_id)`, withCheck: sql`(auth.uid() = auth_user_id)`  }),
	pgPolicy("Public can view center profiles", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("center_profiles_admin_manage", { as: "permissive", for: "all", to: ["authenticated"] }),
	pgPolicy("center_profiles_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("center_profiles_select_own", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("center_profiles_update_active", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("center_profiles_update_blacklisted", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("center_profiles_update_deactive", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("center_profiles_update_pending_or_submitted", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("center_profiles_update_rejected", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const languages = pgTable("languages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "languages_auth_user_id_fkey"
		}),
]);

export const clientReferralRequests = pgTable("client_referral_requests", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	centerUserId: uuid("center_user_id").notNull(),
	customerUserId: uuid("customer_user_id").notNull(),
	customerAuthUserId: uuid("customer_auth_user_id").notNull(),
	customerEmail: text("customer_email"),
	customerName: text("customer_name"),
	customerPhone: text("customer_phone"),
	note: text(),
	status: referralRequestStatus().default('pending').notNull(),
	referralCode: text("referral_code"),
	rejectionNote: text("rejection_note"),
	decidedAt: timestamp("decided_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_client_referral_requests_center_user_id").using("btree", table.centerUserId.asc().nullsLast().op("uuid_ops")),
	index("idx_client_referral_requests_customer_user_id").using("btree", table.customerUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.centerUserId],
			foreignColumns: [users.id],
			name: "client_referral_requests_center_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerAuthUserId],
			foreignColumns: [users.id],
			name: "client_referral_requests_customer_auth_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.customerUserId],
			foreignColumns: [users.id],
			name: "client_referral_requests_customer_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Centers can update own referral requests", { as: "permissive", for: "update", to: ["authenticated"], using: sql`((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = client_referral_requests.center_user_id) AND (u.auth_user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM center_profiles cp
  WHERE ((cp.user_id = client_referral_requests.center_user_id) AND (cp.auth_user_id = auth.uid())))))`, withCheck: sql`((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = client_referral_requests.center_user_id) AND (u.auth_user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM center_profiles cp
  WHERE ((cp.user_id = client_referral_requests.center_user_id) AND (cp.auth_user_id = auth.uid())))))`  }),
	pgPolicy("Centers can view own referral requests", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("Create referral", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Customers can insert own referral requests", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("Customers can view own referral requests", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("View own referrals", { as: "permissive", for: "select", to: ["public"] }),
]);

export const flatPages = pgTable("flat_pages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	slug: text().notNull(),
	description: text().default(').notNull(),
	enabled: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("flat_pages_slug_unique").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	pgPolicy("Public can view flat pages", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(enabled = true)` }),
	pgPolicy("flat_pages_admin_manage", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const leads = pgTable("leads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text().notNull(),
	phone: text(),
	message: text(),
	source: text(),
	pageUrl: text("page_url"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	pgPolicy("Admins can view leads", { as: "permissive", for: "select", to: ["authenticated"], using: sql`is_admin()` }),
	pgPolicy("Public can create leads", { as: "permissive", for: "insert", to: ["anon", "authenticated"] }),
]);

export const modules = pgTable("modules", {
	moduleId: uuid("module_id").defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	moduleName: text("module_name").notNull(),
	moduleParent: text("module_parent"),
	link: text(),
	moduleNameLabel: text("module_name_label"),
	moduleParentLabel: text("module_parent_label"),
}, (table) => [
	unique("modules_module_name_key").on(table.moduleName),
	pgPolicy("modules_admin_only", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const permissions = pgTable("permissions", {
	permissionId: uuid("permission_id").defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	permissionName: text("permission_name").notNull(),
}, (table) => [
	unique("permissions_permission_name_key").on(table.permissionName),
	pgPolicy("permissions_admin_only", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const pricingSettings = pgTable("pricing_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pricingContent: text("pricing_content").notNull(),
	expiryDate: date("expiry_date"),
	isVisible: boolean("is_visible").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	index("idx_pricing_settings_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "pricing_settings_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Public can view pricing", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((is_visible = true) AND ((expiry_date IS NULL) OR (expiry_date >= CURRENT_DATE)) AND (EXISTS ( SELECT 1
   FROM center_profiles cp
  WHERE ((cp.auth_user_id = pricing_settings.auth_user_id) AND (cp.approval_status = 'active'::center_approval_status)))))` }),
	pgPolicy("pricing_settings_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const rolePermissions = pgTable("role_permissions", {
	rolePermissionId: uuid("role_permission_id").defaultRandom().primaryKey().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	roleId: uuid("role_id").notNull(),
	permissionId: uuid("permission_id").notNull(),
	moduleId: uuid("module_id").notNull(),
}, (table) => [
	index("idx_role_permissions_module").using("btree", table.moduleId.asc().nullsLast().op("uuid_ops")),
	index("idx_role_permissions_role").using("btree", table.roleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.moduleId],
			foreignColumns: [modules.moduleId],
			name: "role_permissions_module_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.permissionId],
			foreignColumns: [permissions.permissionId],
			name: "role_permissions_permission_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.roleId],
			name: "role_permissions_role_id_fkey1"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("role_permissions_unique_triplet").on(table.roleId, table.permissionId, table.moduleId),
	pgPolicy("role_permissions_admin_only", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const rolePermissionsLegacy = pgTable("role_permissions_legacy", {
	permissionId: uuid("permission_id").defaultRandom().primaryKey().notNull(),
	roleId: uuid("role_id").notNull(),
	module: text().notNull(),
	canView: boolean("can_view").default(false).notNull(),
	canCreate: boolean("can_create").default(false).notNull(),
	canEdit: boolean("can_edit").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.roleId],
			name: "role_permissions_role_id_fkey"
		}).onDelete("cascade"),
	unique("role_permissions_role_module_unique").on(table.roleId, table.module),
	pgPolicy("role_permissions_legacy_admin_only", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const roles = pgTable("roles", {
	roleId: uuid("role_id").defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("roles_name_key").on(table.name),
	pgPolicy("roles_admin_only", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
]);

export const services = pgTable("services", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	serviceName: text("service_name").notNull(),
	description: text(),
	departmentId: uuid("department_id").notNull(),
	ageGroupId: uuid("age_group_id"),
	expiryDate: date("expiry_date"),
	status: text().default('active').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	index("idx_services_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("services_auth_user_id_service_name_key").using("btree", table.authUserId.asc().nullsLast().op("text_ops"), table.serviceName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ageGroupId],
			foreignColumns: [ageGroups.id],
			name: "fk_age_group"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.departmentId],
			foreignColumns: [departments.id],
			name: "fk_department"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "services_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Public can view active services", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((lower(status) = 'active'::text) AND (EXISTS ( SELECT 1
   FROM center_profiles cp
  WHERE ((cp.auth_user_id = services.auth_user_id) AND (cp.approval_status = 'active'::center_approval_status)))))` }),
	pgPolicy("Public read services", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("services_admin_manage", { as: "permissive", for: "all", to: ["authenticated"] }),
	pgPolicy("services_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
	check("services_status_check", sql`status = ANY (ARRAY['active'::text, 'inactive'::text])`),
]);

export const siteSeoSettings = pgTable("site_seo_settings", {
	key: text().primaryKey().notNull(),
	metaTitle: text("meta_title").default(').notNull(),
	metaDescription: text("meta_description").default(').notNull(),
	ogImageUrl: text("og_image_url").default(').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const specialistEducations = pgTable("specialist_educations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	specialistId: uuid("specialist_id"),
	degree: text().notNull(),
	university: text().notNull(),
	fromDate: date("from_date").notNull(),
	toDate: date("to_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	certificates: jsonb().default([]).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.specialistId],
			foreignColumns: [specialists.id],
			name: "specialist_education_specialist_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("specialist_educations_manage_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(is_center() AND (EXISTS ( SELECT 1
   FROM specialists s
  WHERE ((s.id = specialist_educations.specialist_id) AND (s.created_by = auth.uid())))))`, withCheck: sql`(is_center() AND (EXISTS ( SELECT 1
   FROM specialists s
  WHERE ((s.id = specialist_educations.specialist_id) AND (s.created_by = auth.uid())))))`  }),
]);

export const specialistExperiences = pgTable("specialist_experiences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	specialistId: uuid("specialist_id").notNull(),
	title: text().notNull(),
	organization: text().notNull(),
	fromDate: date("from_date").notNull(),
	toDate: date("to_date"),
	certificates: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("specialist_experiences_specialist_id_idx").using("btree", table.specialistId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.specialistId],
			foreignColumns: [specialists.id],
			name: "specialist_experiences_specialist_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("specialist_experiences_manage_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(is_center() AND (EXISTS ( SELECT 1
   FROM specialists s
  WHERE ((s.id = specialist_experiences.specialist_id) AND (s.created_by = auth.uid())))))`, withCheck: sql`(is_center() AND (EXISTS ( SELECT 1
   FROM specialists s
  WHERE ((s.id = specialist_experiences.specialist_id) AND (s.created_by = auth.uid())))))`  }),
]);

export const specialistLanguages = pgTable("specialist_languages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	specialistId: uuid("specialist_id"),
	language: text().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.specialistId],
			foreignColumns: [specialists.id],
			name: "specialist_languages_specialist_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Public can view specialist languages", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (specialists s
     JOIN center_profiles cp ON ((cp.auth_user_id = s.created_by)))
  WHERE ((s.id = specialist_languages.specialist_id) AND (s.feature_on_website = true) AND (cp.approval_status = 'active'::center_approval_status))))` }),
	pgPolicy("specialist_languages_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const specializations = pgTable("specializations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	index("idx_specializations_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("specializations_auth_user_id_name_key").using("btree", table.authUserId.asc().nullsLast().op("text_ops"), table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "specializations_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Admins can manage specializations", { as: "permissive", for: "all", to: ["authenticated"], using: sql`is_admin()`, withCheck: sql`is_admin()`  }),
	pgPolicy("Public can view specializations", { as: "permissive", for: "select", to: ["anon", "authenticated"] }),
	pgPolicy("specializations_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const termsAndConditions = pgTable("terms_and_conditions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	termsContent: text("terms_content").notNull(),
	lastRevised: date("last_revised"),
	isVisible: boolean("is_visible").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	index("idx_terms_and_conditions_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "terms_and_conditions_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Public can view terms", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`((is_visible = true) AND ((last_revised IS NULL) OR (last_revised <= CURRENT_DATE)))` }),
	pgPolicy("terms_and_conditions_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const therapists = pgTable("therapists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	fullName: text("full_name").notNull(),
	email: text(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	authUserId: uuid("auth_user_id"),
}, (table) => [
	index("idx_therapists_auth_user_id").using("btree", table.authUserId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("therapists_auth_user_id_full_name_key").using("btree", table.authUserId.asc().nullsLast().op("text_ops"), table.fullName.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.authUserId],
			foreignColumns: [users.id],
			name: "therapists_auth_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("therapists_manage_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(is_center() AND (auth.uid() = auth_user_id))`, withCheck: sql`(is_center() AND (auth.uid() = auth_user_id))`  }),
]);

export const serviceTherapists = pgTable("service_therapists", {
	serviceId: uuid("service_id").notNull(),
	therapistId: uuid("therapist_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "service_therapists_service_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.therapistId],
			foreignColumns: [therapists.id],
			name: "service_therapists_therapist_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.serviceId, table.therapistId], name: "service_therapists_pkey"}),
	pgPolicy("service_therapists_manage_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(is_center() AND (EXISTS ( SELECT 1
   FROM services s
  WHERE ((s.id = service_therapists.service_id) AND (s.auth_user_id = auth.uid())))))`, withCheck: sql`(is_center() AND (EXISTS ( SELECT 1
   FROM services s
  WHERE ((s.id = service_therapists.service_id) AND (s.auth_user_id = auth.uid())))))`  }),
]);

export const serviceSpecializations = pgTable("service_specializations", {
	serviceId: uuid("service_id").notNull(),
	specializationId: uuid("specialization_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "service_specializations_service_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.specializationId],
			foreignColumns: [specializations.id],
			name: "service_specializations_specialization_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.serviceId, table.specializationId], name: "service_specializations_pkey"}),
	pgPolicy("Public can view service specializations", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (services s
     JOIN center_profiles cp ON ((cp.auth_user_id = s.auth_user_id)))
  WHERE ((s.id = service_specializations.service_id) AND (lower(s.status) = 'active'::text) AND (cp.approval_status = 'active'::center_approval_status))))` }),
	pgPolicy("service_specializations_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const serviceAgeGroups = pgTable("service_age_groups", {
	serviceId: uuid("service_id").notNull(),
	ageGroupId: uuid("age_group_id").notNull(),
}, (table) => [
	index("idx_service_age_groups_age_group_id").using("btree", table.ageGroupId.asc().nullsLast().op("uuid_ops")),
	index("idx_service_age_groups_service_id").using("btree", table.serviceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.ageGroupId],
			foreignColumns: [ageGroups.id],
			name: "service_age_groups_age_group_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [services.id],
			name: "service_age_groups_service_id_fkey"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.serviceId, table.ageGroupId], name: "service_age_groups_pkey"}),
	pgPolicy("Public can view service age groups", { as: "permissive", for: "select", to: ["anon", "authenticated"], using: sql`(EXISTS ( SELECT 1
   FROM (services s
     JOIN center_profiles cp ON ((cp.auth_user_id = s.auth_user_id)))
  WHERE ((s.id = service_age_groups.service_id) AND (lower(s.status) = 'active'::text) AND (cp.approval_status = 'active'::center_approval_status))))` }),
	pgPolicy("service_age_groups_manage_own", { as: "permissive", for: "all", to: ["authenticated"] }),
]);
