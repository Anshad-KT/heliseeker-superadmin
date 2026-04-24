import { redirect } from "next/navigation"

export default function LeadDetailRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/admin/enquiries/${params.id}`)
}
