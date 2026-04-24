"use client"

import { useParams } from "next/navigation"

import { BackButton } from "@/components/custom-ui"
import { ContentLoading, ContentNotFound } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { useStaffUsers } from "@/app/admin/access/_hooks/use-staff"

function formatCreatedAt(value?: string | null) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function renderText(value: unknown) {
  if (value === undefined || value === null) return "—"
  const text = String(value)
  return text.trim() ? text : "—"
}

export default function StaffUserViewPage() {
  const access = useRequirePermission("userManagement", "view")
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string | undefined)

  const staffQuery = useStaffUsers()
  const staffUsers = staffQuery.data?.data || []
  const user = staffUsers.find((u) => u.id === id) ?? null

  if (!access.isReady) {
    return <ContentLoading />
  }

  if (!access.can("userManagement", "view")) {
    return <ContentNotFound message="You do not have access to view staff users." />
  }

  const wrapClass = "whitespace-pre-wrap break-words [overflow-wrap:anywhere]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">Staff User Details</h1>
          <p className="text-sm text-muted-foreground break-words">Full details (no truncation).</p>
        </div>
        <BackButton />
      </div>

      {staffQuery.isLoading ? (
        <ContentLoading />
      ) : staffQuery.isError ? (
        <ContentNotFound message={(staffQuery.error as any)?.message || "Failed to load staff users."} />
      ) : !id || !user ? (
        <ContentNotFound message="Staff user not found." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className={wrapClass}>{renderText(user.name)}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className={`font-medium ${wrapClass}`}>{renderText(user.email)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Role</p>
              <p className={`font-medium ${wrapClass}`}>{renderText(user.role?.replace("_", " "))}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`font-medium ${wrapClass}`}>{user.active ? "Active" : "Inactive"}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs text-muted-foreground">Created At</p>
              <p className={`font-medium ${wrapClass}`}>{formatCreatedAt(user.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
