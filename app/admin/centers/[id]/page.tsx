"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Check, Loader2, Stethoscope, X } from "lucide-react"
import { useForm } from "react-hook-form"

import { useAccess } from "@/app/admin/access/_hooks/use-access"
import { BackButton } from "@/components/custom-ui"
import { ContentLoading, ContentNotFound } from "@/components/common"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { formatStringToMMMMddyy } from "@/lib/utils"
import { useTRPC } from "@/trpc/client"

import { useUpdateCenterStatus } from "../_hooks/use-centers"
import type { CenterApprovalStatus } from "../_types"

const formatDate = (value?: string | null) => (value ? formatStringToMMMMddyy(value) : "—")
const renderValue = (value?: string | number | null) => (value === null || value === undefined || value === "" ? "—" : value)
const detailsValueClassName = "font-medium break-words whitespace-pre-wrap"

const referralStatusStyles: Record<"pending" | "approved" | "rejected", string> = {
  pending: "border-blue-200 text-blue-700 bg-blue-50",
  approved: "border-green-200 text-green-700 bg-green-50",
  rejected: "border-red-200 text-red-700 bg-red-50",
}

function getServiceStatusClass(value?: string | null) {
  const status = (value ?? "").toLowerCase()
  if (!status) return "border-zinc-300 text-zinc-700 bg-zinc-100"
  if (status === "active") return "border-green-200 text-green-700 bg-green-50"
  if (status === "inactive") return "border-amber-200 text-amber-700 bg-amber-50"
  if (status === "disabled") return "border-amber-200 text-amber-700 bg-amber-50"
  if (status === "rejected") return "border-red-200 text-red-700 bg-red-50"
  return "border-zinc-300 text-zinc-700 bg-zinc-100"
}

function getDepartmentStatusClass(value?: string | null) {
  const status = (value ?? "").toLowerCase()
  if (!status) return "border-zinc-300 text-zinc-700 bg-zinc-100"
  if (status === "active") return "border-green-200 text-green-700 bg-green-50"
  if (status === "inactive") return "border-amber-200 text-amber-700 bg-amber-50"
  return "border-zinc-300 text-zinc-700 bg-zinc-100"
}

type AttachmentPreviewKind = "pdf" | "image" | "other"

type AttachmentPreview = {
  url: string
  name?: string | null
  kind: AttachmentPreviewKind
}

function getAttachmentPreviewKind(url: string, name?: string | null): AttachmentPreviewKind {
  const getExtension = (value?: string | null) => {
    if (!value) return null
    const cleaned = value.split("?")[0].split("#")[0]
    const parts = cleaned.toLowerCase().split(".")
    if (parts.length < 2) return null
    return parts.pop() ?? null
  }

  const ext = getExtension(name) ?? getExtension(url)
  if (!ext) return "other"
  if (ext === "pdf") return "pdf"
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "avif"].includes(ext)) return "image"
  return "other"
}

function getAttachmentPreviewSrc(url: string, kind: AttachmentPreviewKind) {
  if (kind !== "pdf") return url
  return `${url}${url.includes("#") ? "&" : "#"}view=FitH`
}

type CenterSettingsFormValues = {
  centerName: string
  shortDescription: string
  location: string
  commercialRegistrationNumber: string
  website: string
  officialEmail: string
  phoneNumber: string
  address: string
  languageSupported: string
  therapistCount: number | null
  centerContactNumber: string
  managerName: string
  managerEmail: string
  managerPhone: string
  managerPrimary: boolean
  marketingRepName: string
  marketingRepEmail: string
  marketingRepPhone: string
  marketingRepPrimary: boolean
  primaryAccentColor: string
  logoUrl: string
}

export default function CenterDetailPage() {
  const params = useParams()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const trpc = useTRPC()
  const { toast } = useToast()
  const access = useAccess()
  const [updatingStatus, setUpdatingStatus] = useState<CenterApprovalStatus | null>(null)
  const [selectedSpecialist, setSelectedSpecialist] = useState<any | null>(null)
  const [editBasicOpen, setEditBasicOpen] = useState(false)
  const [preview, setPreview] = useState<AttachmentPreview | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectionDescription, setRejectionDescription] = useState("")

  const centerQuery = useQuery({
    ...trpc.centers.byId.queryOptions({ id: id ?? "" }),
    enabled: Boolean(id),
  })

  const updateStatusMutation = useUpdateCenterStatus()
  const center = centerQuery.data?.data
  const onboarding = center?.onboarding
  const clientRequests = center?.clientRequests ?? []
  const languages = onboarding?.operations?.languageSupported ?? []
  const isUpdating = updateStatusMutation.isPending
  const isApproving = isUpdating && updatingStatus === "active"
  const isRejecting = isUpdating && updatingStatus === "rejected"

  const handleUpdateStatus = async (status: CenterApprovalStatus, approvalNote?: string) => {
    if (!center?.id) return false

    setUpdatingStatus(status)
    try {
      await updateStatusMutation.mutateAsync({ id: center.id, status, approvalNote })
      await centerQuery.refetch()
      toast({
        title: "Status updated",
        description:
          status === "rejected"
            ? "Rejected successfully. In-app notification and rejection email flow were triggered."
            : status === "active"
              ? "Approved successfully. In-app notification and approval email flow were triggered."
              : `Center status changed to ${status}.`,
        variant: "success",
      })
      return true
    } catch (mutationError) {
      const message = mutationError instanceof Error ? mutationError.message : "Failed to update center status"
      toast({
        title: "Status update failed",
        description: message,
        variant: "destructive",
      })
      return false
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleRejectCenter = async () => {
    const note = rejectionDescription.trim()
    if (!note) {
      toast({
        title: "Rejection description required",
        description: "Please enter the reason for rejecting this center.",
        variant: "destructive",
      })
      return
    }

    const success = await handleUpdateStatus("rejected", note)
    if (success) {
      setRejectDialogOpen(false)
      setRejectionDescription("")
    }
  }

  const handleOpenAttachment = (url?: string | null, name?: string | null) => {
    if (!url) return
    const kind = getAttachmentPreviewKind(url, name)
    if (kind === "other") {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }
    setPreview({ url, name, kind })
  }

  const settingsForm = useForm<CenterSettingsFormValues>({
    defaultValues: {
      centerName: "",
      shortDescription: "",
      location: "",
      commercialRegistrationNumber: "",
      website: "",
      officialEmail: "",
      phoneNumber: "",
      address: "",
      languageSupported: "",
      therapistCount: 0,
      centerContactNumber: "",
      managerName: "",
      managerEmail: "",
      managerPhone: "",
      managerPrimary: true,
      marketingRepName: "",
      marketingRepEmail: "",
      marketingRepPhone: "",
      marketingRepPrimary: false,
      primaryAccentColor: "#ABBA30",
      logoUrl: "",
    },
  })

  useEffect(() => {
    if (!editBasicOpen) return

    const currentLanguages = languages.length ? languages.join(", ") : ""

    settingsForm.reset({
      centerName: onboarding?.basicInfo?.centerName ?? center?.centerName ?? "",
      shortDescription: onboarding?.basicInfo?.shortDescription ?? "",
      location: onboarding?.basicInfo?.location ?? "",
      commercialRegistrationNumber: onboarding?.basicInfo?.commercialRegistrationNumber ?? "",
      website: onboarding?.basicInfo?.website ?? "",
      officialEmail: onboarding?.basicInfo?.officialEmail ?? "",
      phoneNumber: onboarding?.basicInfo?.phoneNumber ?? "",
      address: onboarding?.basicInfo?.address ?? "",
      languageSupported: currentLanguages,
      therapistCount: onboarding?.operations?.therapistCount ?? 0,
      centerContactNumber: onboarding?.operations?.centerContactNumber ?? "",
      managerName: onboarding?.operations?.managerName ?? "",
      managerEmail: onboarding?.operations?.managerEmail ?? "",
      managerPhone: onboarding?.operations?.managerPhone ?? "",
      managerPrimary: onboarding?.operations?.managerPrimary ?? true,
      marketingRepName: onboarding?.operations?.marketingRepName ?? "",
      marketingRepEmail: onboarding?.operations?.marketingRepEmail ?? "",
      marketingRepPhone: onboarding?.operations?.marketingRepPhone ?? "",
      marketingRepPrimary: onboarding?.operations?.marketingRepPrimary ?? false,
      primaryAccentColor: onboarding?.customize?.primaryAccentColor ?? "#ABBA30",
      logoUrl: onboarding?.customize?.logoUrl ?? "",
    })
  }, [editBasicOpen, settingsForm, onboarding, center, languages])

  const updateSettingsMutation = useMutation(
    trpc.centers.updateSettings.mutationOptions({
      onSuccess: async () => {
        toast({ title: "Updated", description: "Center basic info updated successfully.", variant: "success" })
        setEditBasicOpen(false)
        await centerQuery.refetch()
      },
      onError: (error) => {
        toast({
          title: "Update failed",
          description: error instanceof Error ? error.message : "Failed to update center basic info.",
          variant: "destructive",
        })
      },
    }),
  )

  const canEditCenter = access.isReady ? access.can("centers", "edit") : false
  const isRejectedCenter = center?.approvalStatus === "rejected"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Center Details</h1>
          <p className="text-sm text-muted-foreground">Full onboarding data for this center.</p>
        </div>
        <BackButton />
      </div>

      {centerQuery.isLoading ? (
        <ContentLoading />
      ) : centerQuery.isError ? (
        <ContentNotFound message={centerQuery.error?.message || "Failed to load center."} />
      ) : !center ? (
        <ContentNotFound message="Center not found." />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 break-words">
                <span className="break-words whitespace-pre-wrap">{center.centerName}</span>
                <Badge className="capitalize" variant="outline">
                  {center.approvalStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Center Name</p>
                <p className={detailsValueClassName}>{center.centerName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Contact Email</p>
                <p className={detailsValueClassName}>{center.contactEmail || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Contact Phone</p>
                <p className={detailsValueClassName}>{center.contactPhone || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={`${detailsValueClassName} capitalize`}>{center.approvalStatus}</p>
              </div>
              {isRejectedCenter ? (
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs text-muted-foreground">Rejection Note</p>
                  <p className={detailsValueClassName}>{center.approvalNote || "—"}</p>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Submitted On</p>
                <p className={detailsValueClassName}>{formatDate(center.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Last Updated</p>
                <p className={detailsValueClassName}>{formatDate(center.updatedAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Decision Date</p>
                <p className={detailsValueClassName}>{formatDate(center.decidedAt)}</p>
              </div>
            </CardContent>
          </Card>

          {!onboarding ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No onboarding details available for this center yet.
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="w-full justify-between rounded-xl bg-primary/10 p-1 h-auto flex gap-1 overflow-x-auto">
                <TabsTrigger
                  value="basic"
                  className="flex-1 min-w-[140px] rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger
                  value="departments"
                  className="flex-1 min-w-[140px] rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Department
                </TabsTrigger>
                <TabsTrigger
                  value="services"
                  className="flex-1 min-w-[140px] rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Service
                </TabsTrigger>
                <TabsTrigger
                  value="specialists"
                  className="flex-1 min-w-[140px] rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Specialist
                </TabsTrigger>
                <TabsTrigger
                  value="client-requests"
                  className="flex-1 min-w-[160px] rounded-lg py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  Client Request
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="mt-0 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Onboarding: Basic Info</CardTitle>
                    {canEditCenter ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditBasicOpen(true)}>
                        Edit
                      </Button>
                    ) : null}
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Center Name</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.centerName)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Short Description</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.shortDescription)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.location)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Commercial Registration #</p>
                      <p className={detailsValueClassName}>
                        {renderValue(onboarding.basicInfo?.commercialRegistrationNumber)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Website</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.website)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Official Email</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.officialEmail)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.phoneNumber)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.basicInfo?.address)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Onboarding: Operations</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs text-muted-foreground">Languages Supported</p>
                      <p className={detailsValueClassName}>{languages.length ? languages.join(", ") : "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Therapist Count</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.therapistCount)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Center Contact Number</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.centerContactNumber)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Manager Name</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.managerName)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Manager Email</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.managerEmail)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Manager Phone</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.managerPhone)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Manager Primary</p>
                      <p className={detailsValueClassName}>
                        {onboarding.operations?.managerPrimary === null ||
                        onboarding.operations?.managerPrimary === undefined
                          ? "—"
                          : onboarding.operations?.managerPrimary
                            ? "Yes"
                            : "No"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marketing Rep Name</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.marketingRepName)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marketing Rep Email</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.marketingRepEmail)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marketing Rep Phone</p>
                      <p className={detailsValueClassName}>{renderValue(onboarding.operations?.marketingRepPhone)}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Marketing Rep Primary</p>
                      <p className={detailsValueClassName}>
                        {onboarding.operations?.marketingRepPrimary === null ||
                        onboarding.operations?.marketingRepPrimary === undefined
                          ? "—"
                          : onboarding.operations?.marketingRepPrimary
                            ? "Yes"
                            : "No"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Onboarding: Customize</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 text-sm md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Primary Accent Color</p>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-4 w-4 rounded border"
                          style={{
                            backgroundColor: onboarding.customize?.primaryAccentColor || "#ffffff",
                          }}
                        />
                        <p className={detailsValueClassName}>
                          {renderValue(onboarding.customize?.primaryAccentColor)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <p className="text-xs text-muted-foreground">Logo</p>
                      {onboarding.customize?.logoUrl ? (
                        <img
                          src={onboarding.customize.logoUrl}
                          alt={`${center.centerName} logo`}
                          className="h-20 w-20 rounded-full border object-cover"
                        />
                      ) : (
                        <p className={detailsValueClassName}>—</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {center.approvalStatus === "submitted" && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Approval Decision</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center justify-end gap-2">
                      <Button type="button" onClick={() => handleUpdateStatus("active")} disabled={isUpdating}>
                        {isApproving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-2 h-4 w-4" />
                        )}
                        {isApproving ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setRejectDialogOpen(true)}
                        disabled={isUpdating}
                      >
                        {isRejecting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <X className="mr-2 h-4 w-4" />
                        )}
                        {isRejecting ? "Processing..." : "Reject"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="departments" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Departments</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {onboarding.departments?.length ? (
                      onboarding.departments.map((department) => (
                        <div
                          key={department.id}
                          className="flex items-start justify-between gap-4 rounded-md border p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className={detailsValueClassName}>{renderValue(department.name)}</p>
                            <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                              {renderValue(department.description)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`capitalize ${getDepartmentStatusClass(department.status)}`}
                          >
                            {renderValue(department.status)}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No departments provided.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="services" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Services</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {onboarding.services?.length ? (
                      <>
                        <div className="space-y-3 md:hidden">
                          {onboarding.services.map((service) => (
                            <div key={service.id} className="rounded-md border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <p className="min-w-0 flex-1 font-medium break-words whitespace-pre-wrap">
                                  {renderValue(service.serviceName)}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`shrink-0 capitalize ${getServiceStatusClass(service.status)}`}
                                >
                                  {renderValue(service.status)}
                                </Badge>
                              </div>
                              <div className="mt-3 space-y-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground">Department</p>
                                  <p className="break-words whitespace-pre-wrap">
                                    {renderValue(service.departmentName)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Description</p>
                                  <p className="break-words whitespace-pre-wrap text-muted-foreground">
                                    {renderValue(service.description)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="hidden md:block">
                          <Table className="table-fixed">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[22%]">Service Name</TableHead>
                                <TableHead className="w-[18%]">Department</TableHead>
                                <TableHead className="w-[45%]">Description</TableHead>
                                <TableHead className="w-[15%]">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {onboarding.services.map((service) => (
                                <TableRow key={service.id}>
                                  <TableCell className="font-medium break-words whitespace-pre-wrap">
                                    {renderValue(service.serviceName)}
                                  </TableCell>
                                  <TableCell className="break-words whitespace-pre-wrap">
                                    {renderValue(service.departmentName)}
                                  </TableCell>
                                  <TableCell className="break-words whitespace-pre-wrap text-muted-foreground">
                                    {renderValue(service.description)}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`capitalize ${getServiceStatusClass(service.status)}`}
                                    >
                                      {renderValue(service.status)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No services provided.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="specialists" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Specialists</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {onboarding.specialists?.length ? (
                      <div className="grid gap-4 xl:grid-cols-2">
                        {onboarding.specialists.map((specialist) => (
                          <Card
                            key={specialist.id}
                            role="button"
                            tabIndex={0}
                            className="relative min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                            onClick={() => setSelectedSpecialist(specialist)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") setSelectedSpecialist(specialist)
                            }}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute right-4 top-4 h-7 rounded-lg border-slate-200 text-slate-600"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedSpecialist(specialist)
                              }}
                            >
                              View
                            </Button>

                            <div className="flex min-w-0 flex-col items-start gap-4 pr-10 sm:flex-row">
                              <div className="grid h-[96px] w-[96px] shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500 sm:h-[120px] sm:w-[120px]">
                                <Stethoscope className="h-10 w-10" />
                              </div>

                              <div className="min-w-0 flex-1 space-y-3">
                                <div>
                                  <h3 className="block break-words text-[14px] font-semibold leading-[21px] tracking-[0] text-slate-900">
                                    {specialist.name}
                                  </h3>
                                  <p className="mt-1 block break-words text-[13px] font-normal leading-[19.5px] tracking-[0] text-slate-500">
                                    {specialist.designation || "Specialist"}
                                  </p>
                                </div>

                                <div className="space-y-1 text-[14px] font-light leading-[174%] tracking-[0] text-slate-700">
                                  <p className="flex min-w-0 flex-wrap items-center gap-1" title={specialist.department || "-"}>
                                    <span className="font-medium">Department:</span>
                                    <span className="break-words">{specialist.department || "-"}</span>
                                  </p>
                                  <p className="break-words">
                                    <span className="font-medium">Experience:</span>{" "}
                                    {specialist.yearsOfExperience !== null && specialist.yearsOfExperience !== undefined
                                      ? `${specialist.yearsOfExperience}+ Years`
                                      : "-"}
                                  </p>
                                  <p className="break-words">
                                    <span className="font-medium">Education:</span>{" "}
                                    {specialist.education?.length ? `${specialist.education.length} entries` : "-"}
                                  </p>
                                  <p className="break-words">
                                    <span className="font-medium">Work History:</span>{" "}
                                    {specialist.experience?.length ? `${specialist.experience.length} entries` : "-"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No specialists provided.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="client-requests" className="mt-0 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Client Requests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {clientRequests.length ? (
                      clientRequests.map((request: any) => (
                        <div key={request.id} className="space-y-2 rounded-md border p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className={detailsValueClassName}>{request.customerName || "—"}</p>
                              <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                                {request.customerEmail || "—"}
                                {request.customerPhone ? ` • ${request.customerPhone}` : ""}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={`capitalize ${referralStatusStyles[request.status as "pending" | "approved" | "rejected"] ?? ""}`}
                            >
                              {request.status}
                            </Badge>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            {request.status === "approved" ? (
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Referral Code</p>
                                <p className={detailsValueClassName}>{request.referralCode || "—"}</p>
                              </div>
                            ) : null}
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Created</p>
                              <p className={detailsValueClassName}>{formatDate(request.createdAt)}</p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <p className="text-xs text-muted-foreground">Note</p>
                              <p className={detailsValueClassName}>{request.note || "—"}</p>
                            </div>
                            {request.status === "rejected" ? (
                              <div className="space-y-1 md:col-span-2">
                                <p className="text-xs text-muted-foreground">Rejection Note</p>
                                <p className={detailsValueClassName}>{request.rejectionNote || "—"}</p>
                              </div>
                            ) : null}
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Decision Date</p>
                              <p className={detailsValueClassName}>{formatDate(request.decidedAt)}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No client requests available for this center.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      <Dialog open={editBasicOpen} onOpenChange={setEditBasicOpen}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Basic Info</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-6"
            onSubmit={settingsForm.handleSubmit(async (values) => {
              if (!center?.id) return

              const normalizeText = (value: string) => {
                const trimmed = value.trim()
                return trimmed.length ? trimmed : null
              }

              const therapistCount = Number.isFinite(values.therapistCount as number) ? (values.therapistCount as number) : 0

              await updateSettingsMutation.mutateAsync({
                id: center.id,
                centerName: normalizeText(values.centerName),
                shortDescription: normalizeText(values.shortDescription),
                location: normalizeText(values.location),
                commercialRegistrationNumber: normalizeText(values.commercialRegistrationNumber),
                website: normalizeText(values.website),
                officialEmail: normalizeText(values.officialEmail),
                phoneNumber: normalizeText(values.phoneNumber),
                address: normalizeText(values.address),
                languageSupported: normalizeText(values.languageSupported),
                therapistCount,
                centerContactNumber: normalizeText(values.centerContactNumber),
                managerName: normalizeText(values.managerName),
                managerEmail: normalizeText(values.managerEmail),
                managerPhone: normalizeText(values.managerPhone),
                managerPrimary: values.managerPrimary,
                marketingRepName: normalizeText(values.marketingRepName),
                marketingRepEmail: normalizeText(values.marketingRepEmail),
                marketingRepPhone: normalizeText(values.marketingRepPhone),
                marketingRepPrimary: values.marketingRepPrimary,
                logoUrl: normalizeText(values.logoUrl),
                primaryAccentColor: normalizeText(values.primaryAccentColor) ?? "#ABBA30",
              })
            })}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-medium">Center Name</p>
                <Input placeholder="Center name" {...settingsForm.register("centerName")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Commercial Registration #</p>
                <Input
                  placeholder="Commercial registration number"
                  {...settingsForm.register("commercialRegistrationNumber")}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Short Description</p>
                <Textarea placeholder="Short description" {...settingsForm.register("shortDescription")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Location</p>
                <Input placeholder="Location" {...settingsForm.register("location")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Website</p>
                <Input placeholder="https://..." {...settingsForm.register("website")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Official Email</p>
                <Input placeholder="email@domain.com" {...settingsForm.register("officialEmail")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Phone Number</p>
                <Input placeholder="+..." {...settingsForm.register("phoneNumber")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Address</p>
                <Textarea placeholder="Address" {...settingsForm.register("address")} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <p className="text-base font-semibold">Operations</p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Languages Supported</p>
                <Input placeholder="English, Arabic, ..." {...settingsForm.register("languageSupported")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Therapist Count</p>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  {...settingsForm.register("therapistCount", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Center Contact Number</p>
                <Input placeholder="+..." {...settingsForm.register("centerContactNumber")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Manager Name</p>
                <Input placeholder="Manager name" {...settingsForm.register("managerName")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Manager Email</p>
                <Input placeholder="email@domain.com" {...settingsForm.register("managerEmail")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Manager Phone</p>
                <Input placeholder="+..." {...settingsForm.register("managerPhone")} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Manager Primary</p>
                  <p className="text-xs text-muted-foreground">Mark manager as primary contact.</p>
                </div>
                <Switch
                  checked={settingsForm.watch("managerPrimary")}
                  onCheckedChange={(checked) => settingsForm.setValue("managerPrimary", checked)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Marketing Rep Name</p>
                <Input placeholder="Marketing rep name" {...settingsForm.register("marketingRepName")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Marketing Rep Email</p>
                <Input placeholder="email@domain.com" {...settingsForm.register("marketingRepEmail")} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Marketing Rep Phone</p>
                <Input placeholder="+..." {...settingsForm.register("marketingRepPhone")} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Marketing Rep Primary</p>
                  <p className="text-xs text-muted-foreground">Mark marketing rep as primary contact.</p>
                </div>
                <Switch
                  checked={settingsForm.watch("marketingRepPrimary")}
                  onCheckedChange={(checked) => settingsForm.setValue("marketingRepPrimary", checked)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <p className="text-base font-semibold">Customize</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Primary Accent Color</p>
                <Input placeholder="#ABBA30" {...settingsForm.register("primaryAccentColor")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Logo URL</p>
                <Input placeholder="https://..." {...settingsForm.register("logoUrl")} />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditBasicOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open)
          if (!open && !isRejecting) {
            setRejectionDescription("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Center</DialogTitle>
            <DialogDescription>
              Add a rejection description. This will be saved and sent in the rejection email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">Rejection description</p>
            <Textarea
              value={rejectionDescription}
              onChange={(event) => setRejectionDescription(event.target.value)}
              placeholder="Explain why this center is being rejected."
              disabled={isRejecting}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectCenter}
              disabled={isRejecting || !rejectionDescription.trim()}
            >
              {isRejecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              {isRejecting ? "Rejecting..." : "Reject Center"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedSpecialist)} onOpenChange={(open) => (!open ? setSelectedSpecialist(null) : undefined)}>
        <DialogContent className="max-w-5xl w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Specialist Details</DialogTitle>
          </DialogHeader>

          {selectedSpecialist ? (
            <div className="space-y-6 text-sm">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className={detailsValueClassName}>{selectedSpecialist.name || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Designation</p>
                  <p className={detailsValueClassName}>{selectedSpecialist.designation || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className={detailsValueClassName}>{selectedSpecialist.department || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Years of Experience</p>
                  <p className={detailsValueClassName}>
                    {selectedSpecialist.yearsOfExperience !== null && selectedSpecialist.yearsOfExperience !== undefined
                      ? selectedSpecialist.yearsOfExperience
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-base font-semibold">Education</p>
                  {selectedSpecialist.education?.length ? (
                    <div className="space-y-3">
                      {selectedSpecialist.education.map((education: any, educationIndex: number) => (
                        <div key={educationIndex} className="rounded-xl border bg-muted/20 p-4">
                          <p className={detailsValueClassName}>
                            {education.degree || "—"}{education.university ? ` • ${education.university}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {education.fromDate ? formatDate(education.fromDate) : "—"}
                            {education.toDate ? ` - ${formatDate(education.toDate)}` : ""}
                          </p>
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Certificates (Attachments)</p>
                            {education.certificates?.length ? (
                              <ul className="list-disc pl-5">
                                {education.certificates.map((certificate: any, certificateIndex: number) => (
                                  <li key={certificateIndex} className="break-words">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAttachment(certificate.dataUrl, certificate.name)}
                                      className="text-left text-blue-600 hover:underline"
                                    >
                                      {certificate.name || "Attachment"}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">—</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No education provided.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-base font-semibold">Experience</p>
                  {selectedSpecialist.experience?.length ? (
                    <div className="space-y-3">
                      {selectedSpecialist.experience.map((experience: any, experienceIndex: number) => (
                        <div key={experienceIndex} className="rounded-xl border bg-muted/20 p-4">
                          <p className={detailsValueClassName}>
                            {experience.title || "—"}{experience.organization ? ` • ${experience.organization}` : ""}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {experience.fromDate ? formatDate(experience.fromDate) : "—"}
                            {experience.toDate ? ` - ${formatDate(experience.toDate)}` : ""}
                          </p>
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-muted-foreground">Certificates (Attachments)</p>
                            {experience.certificates?.length ? (
                              <ul className="list-disc pl-5">
                                {experience.certificates.map((certificate: any, certificateIndex: number) => (
                                  <li key={certificateIndex} className="break-words">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAttachment(certificate.dataUrl, certificate.name)}
                                      className="text-left text-blue-600 hover:underline"
                                    >
                                      {certificate.name || "Attachment"}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">—</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No experience provided.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(preview)} onOpenChange={(open) => (!open ? setPreview(null) : undefined)}>
        <DialogContent className="h-[92vh] w-[100vw] max-w-[100vw] rounded-none border-0 p-0 sm:h-[88vh] sm:w-[95vw] sm:max-w-5xl sm:rounded-2xl sm:border">
          <div className="flex h-full flex-col">
            <DialogHeader className="border-b bg-background px-4 py-3 pr-12 sm:px-5">
              <DialogTitle className="line-clamp-2 text-left text-base leading-6 sm:text-xl">
                {preview?.name || "Attachment Preview"}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-hidden bg-slate-950/5">
              {preview?.kind === "image" ? (
                <div className="flex h-full w-full items-center justify-center bg-muted/20 p-3 sm:p-4">
                  <img
                    src={preview.url}
                    alt={preview.name || "Attachment"}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}
                    className="max-h-full max-w-full cursor-zoom-in rounded-md border object-contain"
                  />
                </div>
              ) : preview?.kind === "pdf" ? (
                <div className="h-full w-full p-0 sm:p-2">
                  <iframe
                    title={preview?.name || "PDF Preview"}
                    src={getAttachmentPreviewSrc(preview.url, preview.kind)}
                    className="h-full w-full bg-white sm:rounded-xl sm:border"
                  />
                </div>
              ) : (
                <div className="p-4 text-sm text-muted-foreground">Preview not available for this attachment.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
