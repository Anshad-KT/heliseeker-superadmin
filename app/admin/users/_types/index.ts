export interface UserItem {
  id: string
  name: string
  email: string
  guardianName?: string
  guardianEmail?: string
  countryOfResidency?: string
  phoneNumber?: string
  nationality?: string
  childName?: string
  dateOfBirth?: string
  primaryLanguage?: string
  avatarUrl?: string
  isVerified: boolean
  isActive: boolean
  userType?: string
  createdAt?: string
  updatedAt?: string
}

export interface UsersResponse {
  data: UserItem[]
}

export interface CreateUserPayload {
  name: string
  email: string
}

export interface CreateUserResponse {
  data: UserItem
  tempPassword: string
}

export interface UpdateUserPayload {
  id: string
  name?: string
  email?: string
  isVerified?: boolean
  isActive?: boolean
}
