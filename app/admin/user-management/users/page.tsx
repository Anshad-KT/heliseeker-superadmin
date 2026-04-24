"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

import { StaffTable } from "@/app/admin/access/_components/staff-table"
import { useCreateStaffUser, useDeleteStaffUser, useStaffUsers, useUpdateStaffUser } from "@/app/admin/access/_hooks/use-staff"
import { useRoles } from "@/app/admin/access/_hooks/use-roles"
import { createStaffSchema, CreateStaffFormValues } from "@/app/admin/access/_schemas/staff.schema"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { StaffUserRow } from "@/app/admin/access/_types"

export default function StaffUsersPage() {
  const access = useRequirePermission("userManagement", "view")
  const { toast } = useToast()
  const { data, isLoading } = useStaffUsers()
  const { data: rolesData, isLoading: rolesLoading } = useRoles()
  const createMutation = useCreateStaffUser()
  const updateMutation = useUpdateStaffUser()
  const deleteMutation = useDeleteStaffUser()
  const rolesFromApi = rolesData?.data || []
  const roles = useMemo(() => {
    const hasSuperAdmin = rolesFromApi.some((role) => role.name.trim().toLowerCase().replace(/[\s-]+/g, "_") === "super_admin")
    if (hasSuperAdmin) return rolesFromApi
    return [{ id: "super_admin", name: "super_admin", permissions: [] }, ...rolesFromApi]
  }, [rolesFromApi])
  const [search, setSearch] = useState("")
  const [editingUser, setEditingUser] = useState<StaffUserRow | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editRole, setEditRole] = useState("")

  const form = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      name: "",
      email: "",
      role: rolesFromApi[0]?.name || "manager",
    },
  })

  useEffect(() => {
    if (roles.length === 0) return
    const current = form.getValues("role")
    const exists = roles.some((role) => role.name === current)
    if (!exists) {
      const fallback = roles.find((role) => role.name !== "super_admin")?.name || roles[0].name
      form.setValue("role", fallback, { shouldValidate: true })
    }
  }, [roles, form])

  const canEdit = access.can("userManagement", "edit")
  const canDelete = access.can("userManagement", "delete")
  const staffUsers = data?.data || []
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return staffUsers
    return staffUsers.filter((user) =>
      [user.name, user.email, user.role]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    )
  }, [search, staffUsers])

  if (!access.isReady) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground">Create staff users for the admin panel.</p>
      </div>

      {access.can("userManagement", "create") && (
        <Card>
        <CardHeader>
          <CardTitle>Create Staff User</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  const response = await createMutation.mutateAsync({
                    name: values.name,
                    email: values.email,
                    role: values.role,
                  })
                  toast({
                    title: "User created",
                    description: `Invite email sent. Temporary password: ${response.tempPassword}`,
                    variant: "success",
                  })
                  form.reset({ name: "", email: "", role: "operator" })
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to create user",
                    variant: "destructive",
                  })
                }
              })}
            >
              <div className="grid gap-3 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          onChange={(event) => field.onChange(event.target.value.toLowerCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} disabled={rolesLoading || roles.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.name}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" disabled={createMutation.isPending}>Create Staff</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchInput
              placeholder="Search staff by name, email, or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading staff users...</p>
          ) : (
            <StaffTable
              users={filteredUsers}
              canEdit={canEdit}
              canDelete={canDelete}
              getViewHref={(id) => `/admin/user-management/users/${id}`}
              onToggleStatus={(id, active) => updateMutation.mutate({ id, active })}
              onEdit={(user) => {
                setEditingUser(user)
                setEditName(user.name || "")
                setEditEmail(user.email || "")
                setEditRole(user.role || roles[0]?.name || "")
              }}
              onDelete={async (user) => {
                if (!canDelete) return
                if (!window.confirm("Delete this staff user? This cannot be undone.")) return
                try {
                  await deleteMutation.mutateAsync({ id: user.id })
                  toast({ title: "Deleted", description: "Staff user deleted", variant: "success" })
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to delete staff user",
                    variant: "destructive",
                  })
                }
              }}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Staff User</DialogTitle>
            <DialogDescription>Update the staff user details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input value={editEmail} onChange={(event) => setEditEmail(event.target.value.toLowerCase())} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Role</label>
              <Select value={editRole} onValueChange={setEditRole} disabled={rolesLoading || roles.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select role"} />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingUser(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!editingUser) return
                try {
                  await updateMutation.mutateAsync({
                    id: editingUser.id,
                    name: editName.trim(),
                    email: editEmail.trim(),
                    role: editRole,
                  })
                  setEditingUser(null)
                  toast({ title: "Updated", description: "Staff user updated", variant: "success" })
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to update staff user",
                    variant: "destructive",
                  })
                }
              }}
              disabled={
                updateMutation.isPending ||
                !canEdit ||
                !editName.trim() ||
                !editEmail.trim() ||
                !editRole
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
