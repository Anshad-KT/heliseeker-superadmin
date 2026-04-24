"use client"

import Link from "next/link"
import { Check, Loader2, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CenterApprovalStatus, CenterProfile } from "../_types"

interface CentersTableProps {
  centers: CenterProfile[]
  onUpdateStatus: (id: string, status: CenterApprovalStatus) => void
  onDelete?: (id: string) => void
  showView?: boolean
  showApprovalActions?: boolean
  showStatusSelect?: boolean
  showDelete?: boolean
  updatingCenterId?: string | null
  updatingStatus?: CenterApprovalStatus | null
}

const statuses: CenterApprovalStatus[] = ["submitted", "active", "deactive", "rejected", "blacklisted"]
const statusStyles: Record<CenterApprovalStatus, string> = {
  submitted: "border-blue-200 text-blue-700 bg-blue-50",
  pending: "border-blue-200 text-blue-700 bg-blue-50",
  active: "border-green-200 text-green-700 bg-green-50",
  deactive: "border-amber-200 text-amber-700 bg-amber-50",
  rejected: "border-red-200 text-red-700 bg-red-50",
  blacklisted: "border-zinc-300 text-zinc-700 bg-zinc-100",
}

const completedActionsByStatus: Partial<Record<CenterApprovalStatus, CenterApprovalStatus[]>> = {
  active: ["deactive", "blacklisted"],
  deactive: ["active"],
  rejected: ["active"],
  blacklisted: ["active"],
}

function getCompletedActionOptions(status: CenterApprovalStatus): CenterApprovalStatus[] {
  return completedActionsByStatus[status] ?? []
}

function getActionLabel(status: CenterApprovalStatus) {
  if (status === "deactive") return "Inactive"
  if (status === "blacklisted") return "Blacklist"
  if (status === "active") return "Active"
  return status
}

export function CentersTable({
  centers,
  onUpdateStatus,
  onDelete,
  showView = true,
  showApprovalActions = false,
  showStatusSelect = false,
  showDelete = false,
  updatingCenterId = null,
  updatingStatus = null,
}: CentersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Sl No</TableHead>
          <TableHead>Center</TableHead>
          <TableHead>Contact Email</TableHead>
          <TableHead>Contact Phone</TableHead>
          <TableHead>Status</TableHead>
          {(showView || showApprovalActions || showStatusSelect || showDelete) && (
            <TableHead className="text-right">Actions</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {centers.map((center, index) => {
          const isUpdatingCenter = updatingCenterId === center.id
          const isApproving = isUpdatingCenter && updatingStatus === "active"
          const isRejecting = isUpdatingCenter && updatingStatus === "rejected"
          const completedActionOptions = showStatusSelect ? getCompletedActionOptions(center.approvalStatus) : []

          return (
            <TableRow key={center.id}>
              <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{center.centerName}</TableCell>
              <TableCell>{center.contactEmail || "—"}</TableCell>
              <TableCell>{center.contactPhone || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline" className={`capitalize ${statusStyles[center.approvalStatus]}`}>
                  {center.approvalStatus}
                </Badge>
              </TableCell>
              {(showView || showApprovalActions || showStatusSelect || showDelete) && (
                <TableCell className="text-right space-x-2">
                  {showView && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/centers/${center.id}`}>View</Link>
                    </Button>
                  )}
                  {showApprovalActions && center.approvalStatus === "submitted" && (
                    <>
                      <Button size="sm" onClick={() => onUpdateStatus(center.id, "active")} disabled={isUpdatingCenter}>
                        {isApproving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        {isApproving ? "Processing..." : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onUpdateStatus(center.id, "rejected")}
                        disabled={isUpdatingCenter}
                      >
                        {isRejecting ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <X className="h-4 w-4 mr-1" />
                        )}
                        {isRejecting ? "Processing..." : "Reject"}
                      </Button>
                    </>
                  )}
                  {showStatusSelect && completedActionOptions.length > 0 && (
                    <Select
                      key={`${center.id}:${center.approvalStatus}`}
                      onValueChange={(value) => onUpdateStatus(center.id, value as CenterApprovalStatus)}
                      disabled={isUpdatingCenter}
                    >
                      <SelectTrigger className="inline-flex w-[140px]">
                        <SelectValue placeholder="User action" />
                      </SelectTrigger>
                      <SelectContent>
                        {completedActionOptions.map((status) => (
                          <SelectItem key={status} value={status} className="uppercase">
                            {getActionLabel(status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {showDelete && onDelete && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => onDelete(center.id)}
                      disabled={isUpdatingCenter}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
