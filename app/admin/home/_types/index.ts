export interface DashboardResponse {
  centers: {
    total: number
    pending: number
    active: number
    rejected: number
    submitted: number
  }
  centersByLocation: {
    location: string
    total: number
    active: number
    pending: number
  }[]
  leadsCount: number
  newUsersLast7Days: number
  recentCenters: {
    id: string
    centerName: string
    location: string
    approvalStatus: string
    createdAt: string
  }[]
  totalUsers: number
  users: {
    id: string
    email?: string | null
    phoneNumber?: string | null
    profileName?: string | null
  }[]
  seo: {
    metaTitle: string
    metaDescription: string
  }
}
