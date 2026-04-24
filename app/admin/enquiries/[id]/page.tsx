"use client"

import { useParams } from "next/navigation"

import { BackButton } from "@/components/custom-ui"
import { ContentLoading, ContentNotFound } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { useLeadById } from "@/app/admin/leads/_hooks/use-leads"

function formatCreatedAt(value?: string | Date | null) {
  if (!value) return "—"
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

export default function EnquiryDetailPage() {
  const access = useRequirePermission("leads", "view")
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const queryEnabled = access.isReady && access.can("leads", "view") && Boolean(id)
  const leadQuery = useLeadById(id ?? undefined, { enabled: queryEnabled })
  const lead = (leadQuery.data as any)?.data ?? null

  if (!access.isReady) {
    return <ContentLoading />
  }

  if (!access.can("leads", "view")) {
    return <ContentNotFound message="You do not have access to view enquiries." />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Enquiry Details</h1>
          <p className="text-sm text-muted-foreground">Full message and contact info.</p>
        </div>
        <BackButton />
      </div>

      {leadQuery.isLoading ? (
        <ContentLoading />
      ) : leadQuery.isError ? (
        <ContentNotFound message={leadQuery.error?.message || "Failed to load enquiry."} />
      ) : !lead ? (
        <ContentNotFound message="Enquiry not found." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{`${lead.firstName} ${lead.lastName}`.trim() || "—"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium break-words">{lead.email || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="font-medium break-words">{lead.phone || "—"}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs text-muted-foreground">Message</p>
              <p className="whitespace-pre-wrap break-words">{lead.message || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium">{formatCreatedAt(lead.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
