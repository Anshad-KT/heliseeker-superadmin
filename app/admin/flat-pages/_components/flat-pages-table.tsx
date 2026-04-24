import { Edit, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { FlatPage } from "@/lib/admin-panel/types"

interface FlatPagesTableProps {
  pages: FlatPage[]
  onToggle: (id: string, enabled: boolean) => void
  onEdit?: (page: FlatPage) => void
  onDelete?: (page: FlatPage) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function FlatPagesTable({
  pages,
  onToggle,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: FlatPagesTableProps) {
  const stripHtml = (value: string) =>
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

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
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Rich Text Description</TableHead>
            <TableHead>Enabled</TableHead>
            {(onEdit || onDelete) && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page, index) => {
            const descriptionText = stripHtml(page.description || "")
            return (
              <TableRow key={page.id}>
                <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-medium">{renderTruncated(page.title || "-", "max-w-[260px]")}</TableCell>
                <TableCell>{renderTruncated(page.slug || "-", "max-w-[260px]")}</TableCell>
                <TableCell>{renderTruncated(descriptionText || "-", "max-w-[420px]")}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={page.enabled} onCheckedChange={(checked) => onToggle(page.id, checked)} />
                    <span className="inline-block min-w-[4.75rem]">{page.enabled ? "Enabled" : "Disabled"}</span>
                  </div>
                </TableCell>
                {(onEdit || onDelete) && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {onEdit && (
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => onEdit(page)}
                          aria-label="Edit page"
                          disabled={!canEdit}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => onDelete(page)}
                          aria-label="Delete page"
                          disabled={!canDelete}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
