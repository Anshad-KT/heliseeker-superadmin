"use client"

import { useForm } from "react-hook-form"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { ContentLoading, ContentNotFound } from "@/components/common"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { useLeads } from "@/app/admin/leads/_hooks/use-leads"
import { LeadsTable } from "@/app/admin/leads/_components/leads-table"

export default function EnquiriesPage() {
  const access = useRequirePermission("leads", "view")
  const filtersForm = useForm({ defaultValues: { q: "" } })
  const filters = filtersForm.watch()

  const queryEnabled = access.isReady && access.can("leads", "view")
  const leadsQuery = useLeads({ q: filters.q, enabled: queryEnabled })
  const leads = (leadsQuery.data as any)?.data ?? []

  if (!access.isReady) {
    return <ContentLoading />
  }

  if (!access.can("leads", "view")) {
    return <ContentNotFound message="You do not have access to view enquiries." />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Enquiries</h1>
        <p className="text-sm text-muted-foreground">Website contact form submissions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Enquiries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-1">
            <SearchInput
              placeholder="Search name/email/phone/message"
              value={filters.q}
              onChange={(e) => filtersForm.setValue("q", e.target.value)}
            />
          </div>

          {leadsQuery.isLoading ? (
            <ContentLoading />
          ) : leadsQuery.isError ? (
            <ContentNotFound message={leadsQuery.error?.message || "Failed to load enquiries."} />
          ) : leads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No enquiries found.</p>
          ) : (
            <LeadsTable leads={leads} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
