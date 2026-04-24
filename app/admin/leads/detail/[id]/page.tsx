"use client"

import { useRouter, useParams } from "next/navigation"

import { LeadType } from "../../types"
import { LabelAndValueComponent } from "@/components/custom-ui"
import { ContentDetailLayout } from "@/components/common"
import { useLead } from "@/hooks/use-leads"

export default function LeadDetail() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { data: lead, isLoading, error } = useLead(id)

  return (
    <ContentDetailLayout
      title="Enquiry Details"
      onEdit={() => router.push(`/admin/enquiries/edit/${id}`)}
      loading={isLoading}
      notFound={!lead || !!error}
      notFoundMessage={error ? "Error loading enquiry." : "Enquiry not found."}
    >
      {lead && (
        <>
          <LabelAndValueComponent label="First Name" value={lead.first_name || ""} />
          <LabelAndValueComponent label="Last Name" value={lead.last_name || ""} />
          <LabelAndValueComponent label="Email" value={lead.email || ""} />
          <LabelAndValueComponent label="Mobile" value={lead.mobile || ""} />
          <LabelAndValueComponent label="Message" value={lead.message || ""} />
          <LabelAndValueComponent label="Created At" value={new Date(lead.created_at).toLocaleString()} />
        </>
      )}
    </ContentDetailLayout>
  )
}
