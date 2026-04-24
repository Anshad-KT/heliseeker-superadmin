import Link from "next/link"

import { Edit, Eye, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export interface MasterTableItem {
  id: string
  name: string
  description?: string
  departmentName?: string
  ageGroupName?: string
  fromAge?: number
  toAge?: number
  unit?: string
  status?: boolean
}

interface MasterTableProps {
  items: MasterTableItem[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  getViewHref?: (id: string) => string
  showDepartment?: boolean
  showAgeGroup?: boolean
  showAgeRange?: boolean
  showStatus?: boolean
  showDescription?: boolean
  nameLabel?: string
  canEdit?: boolean
  canDelete?: boolean
}

export function MasterTable({
  items,
  onEdit,
  onDelete,
  getViewHref,
  showDepartment,
  showAgeGroup,
  showAgeRange,
  showStatus,
  showDescription = true,
  nameLabel = "Name",
  canEdit = true,
  canDelete = true,
}: MasterTableProps) {
  const renderTruncated = (value: string, maxWidthClass: string) => {
    const text = value?.trim() ? value : "-"
    if (text === "-") {
      return <div className={`${maxWidthClass} truncate`}>{text}</div>
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${maxWidthClass} truncate`}>{text}</div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[520px] whitespace-pre-wrap break-words">
          {text}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Sl No</TableHead>
            <TableHead>{nameLabel}</TableHead>
            {showAgeRange && (
              <>
                <TableHead>From Age</TableHead>
                <TableHead>To Age</TableHead>
                <TableHead>Unit</TableHead>
              </>
            )}
            {showDepartment && <TableHead>Department</TableHead>}
            {showAgeGroup && <TableHead>Age Group</TableHead>}
            {showDescription && <TableHead>Description</TableHead>}
            {showStatus && <TableHead>Status</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{renderTruncated(item.name, "max-w-[320px]")}</TableCell>
              {showAgeRange && (
                <>
                  <TableCell>{item.fromAge ?? "-"}</TableCell>
                  <TableCell>{item.toAge ?? "-"}</TableCell>
                  <TableCell>{item.unit ?? "-"}</TableCell>
                </>
              )}
              {showDepartment && <TableCell>{renderTruncated(item.departmentName || "-", "max-w-[240px]")}</TableCell>}
              {showAgeGroup && <TableCell>{renderTruncated(item.ageGroupName || "-", "max-w-[240px]")}</TableCell>}
              {showDescription && <TableCell>{renderTruncated(item.description || "-", "max-w-[360px]")}</TableCell>}
              {showStatus && (
                <TableCell>{item.status === undefined ? "-" : item.status ? "Active" : "Inactive"}</TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {getViewHref && (
                    <Button size="icon" variant="outline" asChild aria-label="View">
                      <Link href={getViewHref(item.id)}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button size="icon" variant="outline" onClick={() => canEdit && onEdit(item.id)} aria-label="Edit" disabled={!canEdit}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => canDelete && onDelete(item.id)} aria-label="Delete" disabled={!canDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
