"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"

import { useProfile } from "@/app/contexts/profile.context"
import { useRoles } from "./use-roles"

type AccessAction = "view" | "create" | "edit" | "delete"

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase()
}

function isSuperAdminRole(value?: string | null) {
  return normalize(value).replace(/[\s-]+/g, "_") === "super_admin"
}

export function useAccess() {
  const { profile } = useProfile()
  const { data: rolesData, isLoading: rolesLoading } = useRoles()

  const roleName = normalize(profile?.role)
  const roles = rolesData?.data || []

  const roleDefinition = useMemo(
    () => roles.find((role) => normalize(role.name) === roleName),
    [roles, roleName],
  )

  const permissions = roleDefinition?.permissions || []

  const can = (moduleKey: string, action: AccessAction = "view") => {
    if (!roleName) return false
    if (isSuperAdminRole(profile?.role)) return true
    if (roles.length === 0) return true
    const target = permissions.find((permission) => normalize(permission.module) === normalize(moduleKey))
    if (!target) return false
    return Boolean(target[action])
  }

  return {
    roleName,
    can,
    isReady: !rolesLoading && Boolean(roleName),
  }
}

export function useRequirePermission(moduleKey: string, action: AccessAction = "view") {
  const router = useRouter()
  const access = useAccess()

  if (access.isReady && !access.can(moduleKey, action)) {
    router.replace("/admin")
  }

  return access
}
