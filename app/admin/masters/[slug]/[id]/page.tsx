"use client"

import { use } from "react"

import { BackButton } from "@/components/custom-ui"
import { ContentLoading, ContentNotFound } from "@/components/common"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { useMasterItems } from "../../_hooks/use-masters"

function renderValue(value: unknown) {
  if (value === undefined || value === null) return "—"
  const text = String(value)
  return text.trim() ? text : "—"
}

export default function MasterItemViewPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = use(params)

  const moduleKey =
    slug === "departments"
      ? "department"
      : slug === "services"
      ? "service"
      : slug === "specializations"
      ? "specialization"
      : "ageGroup"

  const access = useRequirePermission(moduleKey, "view")

  const itemsQuery = useMasterItems(slug)
  const departmentQuery = useMasterItems("departments")
  const ageGroupQuery = useMasterItems("age-groups")

  const rawItems = itemsQuery.data?.data || []
  const current = rawItems.find((item: any) => item?.id === id) ?? null

  const departmentMap = new Map((departmentQuery.data?.data || []).map((item: any) => [item.id, item.name]))
  const ageGroupMap = new Map((ageGroupQuery.data?.data || []).map((item: any) => [item.id, item.name]))

  const title =
    slug === "departments"
      ? "Department Details"
      : slug === "services"
      ? "Service Details"
      : slug === "specializations"
      ? "Specialization Details"
      : "Age Group Details"

  if (!access.isReady) {
    return <ContentLoading />
  }

  if (!access.can(moduleKey, "view")) {
    return <ContentNotFound message="You do not have access to view this item." />
  }

  if (itemsQuery.isLoading) {
    return <ContentLoading />
  }

  if (itemsQuery.isError) {
    return <ContentNotFound message={(itemsQuery.error as any)?.message || "Failed to load item."} />
  }

  if (!current) {
    return <ContentNotFound message="Item not found." />
  }

  const name = current.service_name ?? current.name ?? ""
  const description = current.description ?? ""
  const departmentName = current.department_id ? departmentMap.get(current.department_id) : undefined
  const ageGroupName = current.age_group_id ? ageGroupMap.get(current.age_group_id) : undefined

  const wrapClass = "whitespace-pre-wrap break-words [overflow-wrap:anywhere]"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">{title}</h1>
          <p className="text-sm text-muted-foreground break-words">Full details (no truncation).</p>
        </div>
        <BackButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className={wrapClass}>{renderValue(name)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2">
          {slug === "services" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Department</p>
              <p className={`font-medium ${wrapClass}`}>{renderValue(departmentName)}</p>
            </div>
          )}

          {slug === "services" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Age Group</p>
              <p className={`font-medium ${wrapClass}`}>{renderValue(ageGroupName)}</p>
            </div>
          )}

          {slug === "age-groups" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">From Age</p>
              <p className={`font-medium ${wrapClass}`}>{renderValue(current.from_age)}</p>
            </div>
          )}

          {slug === "age-groups" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">To Age</p>
              <p className={`font-medium ${wrapClass}`}>{renderValue(current.to_age)}</p>
            </div>
          )}

          {slug === "age-groups" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Unit</p>
              <p className={`font-medium ${wrapClass}`}>{renderValue(current.unit)}</p>
            </div>
          )}

          {slug === "age-groups" && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`font-medium ${wrapClass}`}>
                {current.status === undefined || current.status === null ? "—" : current.status ? "Active" : "Inactive"}
              </p>
            </div>
          )}

          {slug !== "specializations" && (
            <div className="space-y-1 md:col-span-2">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className={wrapClass}>{renderValue(description)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
