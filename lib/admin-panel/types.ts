export type CenterStatus = "submitted" | "pending" | "active" | "deactive" | "rejected" | "blacklisted"
export type ReferralType = "patient" | "self"

export interface Center {
  id: string
  name: string
  department: string
  city: string
  status: CenterStatus
  referralType: ReferralType
  approvalNote?: string
  createdAt: string
}

export interface ReferralHistory {
  centerName: string
  usedAt: string
  note: string
}

export interface Patient {
  id: string
  name: string
  email: string
  isActive: boolean
  createdAt: string
  referralHistory: ReferralHistory[]
}

export type FilterKind = "department" | "therapy" | "service" | "ageRange" | "location" | "language"

export type AgeUnit = "month" | "year"

export interface SearchFilterItem {
  id: string
  kind: FilterKind
  name: string
  description?: string
  parentId?: string
  enabled: boolean
  order: number
  fromAge?: number
  toAge?: number
  unit?: AgeUnit
}

export interface StaffPermission {
  module: string
  view: boolean
  create: boolean
  edit: boolean
  delete?: boolean
}

export interface Role {
  id: string
  name: string
  permissions: StaffPermission[]
}

export interface StaffUser {
  id: string
  name: string
  email: string
  role: "super_admin" | "manager" | "operator"
  active: boolean
  permissions: StaffPermission[]
}

export interface FlatPage {
  id: string
  title: string
  slug: string
  description: string
  enabled: boolean
  updatedAt: string
}

export interface SeoSettings {
  metaTitle: string
  metaDescription: string
  ogImageUrl: string
}

export interface TagItem {
  id: string
  tagName: string
  tagType: string
  keyword: string
  question: string
  linkedCategory: string
  enabled: boolean
}

export interface AdminPanelDb {
  centers: Center[]
  patients: Patient[]
  searchFilters: SearchFilterItem[]
  roles: Role[]
  staffUsers: StaffUser[]
  flatPages: FlatPage[]
  seo: SeoSettings
  tags: TagItem[]
}
