import { Edit, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Role } from "@/lib/admin-panel/types"

const moduleLabelMap: Record<string, string> = {
  leads: "enquiries",
}

function getModuleLabel(moduleKey: string) {
  return moduleLabelMap[moduleKey] ?? moduleKey
}

interface RolesTableProps {
  roles: Role[]
  onEdit?: (role: Role) => void
  onDelete?: (role: Role) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function RolesTable({ roles, onEdit, onDelete, canEdit = true, canDelete = true }: RolesTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">Sl No</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Module Permissions</TableHead>
          {(onEdit || onDelete) && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role, index) => (
          <TableRow key={role.id}>
            <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium">{role.name}</TableCell>
            <TableCell className="space-x-1">
              {role.permissions.map((permission) => (
                <Badge key={`${role.id}-${permission.module}`} variant="outline">
                  {getModuleLabel(permission.module)}: {permission.view ? "V" : "-"}/{permission.create ? "C" : "-"}/{permission.edit ? "E" : "-"}/{permission.delete ? "D" : "-"}
                </Badge>
              ))}
            </TableCell>
            {(onEdit || onDelete) && (
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onEdit && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onEdit(role)}
                      aria-label="Edit role"
                      disabled={!canEdit}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => onDelete(role)}
                      aria-label="Delete role"
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
