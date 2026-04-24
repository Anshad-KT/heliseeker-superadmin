import Link from "next/link"

import { Edit, Eye, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StaffUserRow } from "../_types"

interface StaffTableProps {
  users: StaffUserRow[]
  onToggleStatus: (id: string, active: boolean) => void
  getViewHref?: (id: string) => string
  onEdit?: (user: StaffUserRow) => void
  onDelete?: (user: StaffUserRow) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function StaffTable({
  users,
  onToggleStatus,
  getViewHref,
  onEdit,
  onDelete,
  canEdit = true,
  canDelete = true,
}: StaffTableProps) {
  const showActions = Boolean(getViewHref || onEdit || onDelete)
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Sl No</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user, index) => (
          <TableRow key={user.id}>
            <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="capitalize">{user.role.replace("_", " ")}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Switch
                  checked={user.active}
                  disabled={!canEdit}
                  onCheckedChange={(checked) => {
                    if (canEdit) onToggleStatus(user.id, checked)
                  }}
                />
                <span>{user.active ? "Active" : "Inactive"}</span>
              </div>
            </TableCell>
            {showActions && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {getViewHref && (
                    <Button size="icon" variant="outline" asChild aria-label="View staff user">
                      <Link href={getViewHref(user.id)}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onEdit(user)}
                      aria-label="Edit staff user"
                      disabled={!canEdit}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => onDelete(user)}
                      aria-label="Delete staff user"
                      disabled={!canDelete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
