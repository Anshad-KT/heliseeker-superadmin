"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { use, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

import { useDeleteRole, useRoles, useUpdateRole } from "../_hooks/use-roles"
import { createRoleSchema, CreateRoleFormValues } from "../_schemas/role.schema"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { Role } from "@/lib/admin-panel/types"

const MODULES = [
  { key: "centers", label: "Centers" },
  { key: "leads", label: "Enquiries" },
  { key: "seo", label: "SEO" },
  { key: "department", label: "Department" },
  { key: "service", label: "Service" },
  { key: "specialization", label: "Specialization" },
  { key: "ageGroup", label: "Age Group" },
  { key: "flatPages", label: "Flat Pages" },
  { key: "customers", label: "Website Users" },
  { key: "userManagement", label: "User Management" },
  { key: "userRoles", label: "User Roles" },
]

export default function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const access = useRequirePermission("userRoles", "edit")
  const rolesQuery = useRoles()
  const updateMutation = useUpdateRole()
  const deleteMutation = useDeleteRole()

  const roles = rolesQuery.data?.data || []
  const role = useMemo(() => roles.find((item) => item.id === id) || null, [roles, id])

  const buildPermissions = useMemo(
    () => (targetRole?: Role | null) =>
      MODULES.map((module) => {
        const current = targetRole?.permissions.find((permission) => permission.module === module.key)
        return {
          module: module.key,
          view: current?.view ?? false,
          create: current?.create ?? false,
          edit: current?.edit ?? false,
          delete: current?.delete ?? false,
        }
      }),
    [],
  )

  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      permissions: buildPermissions(null),
    },
  })

  useEffect(() => {
    if (!role) return
    form.reset({ name: role.name, permissions: buildPermissions(role) })
  }, [role, form, buildPermissions])

  if (!access.isReady || rolesQuery.isLoading) {
    return <AppLoader label="Loading..." className="justify-start text-sm" imageClassName="h-9 w-9" />
  }

  if (!role) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Edit Role</h1>
            <p className="text-sm text-muted-foreground">Role not found.</p>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin/access")}>
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Edit Role</h1>
          <p className="text-sm text-muted-foreground">Update role name and module permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/access")}>
            Back
          </Button>
          {access.can("userRoles", "delete") && (
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={async () => {
                if (!window.confirm("Delete this role? This cannot be undone.")) return
                try {
                  await deleteMutation.mutateAsync({ id: role.id })
                  toast({ title: "Deleted", description: "Role deleted successfully.", variant: "success" })
                  router.push("/admin/access")
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to delete role.",
                    variant: "destructive",
                  })
                }
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                const permissions = values.permissions.filter(
                  (permission) => permission.view || permission.create || permission.edit || permission.delete,
                )

                try {
                  await updateMutation.mutateAsync({
                    id: role.id,
                    name: values.name,
                    permissions,
                  })
                  toast({ title: "Updated", description: "Role updated successfully.", variant: "success" })
                } catch (err: any) {
                  toast({
                    title: "Error",
                    description: err?.message || "Failed to update role.",
                    variant: "destructive",
                  })
                }
              })}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="grid gap-2 md:grid-cols-[180px_1fr] md:items-center">
                      <FormLabel className="md:mb-0">
                        Role Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <div>
                        <FormControl>
                          <Input placeholder="Enter Role Name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="permissions"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Module Permissions</FormLabel>
                    <div className="rounded-md border">
                      {MODULES.map((module, index) => {
                        const current = field.value[index]
                        const view = current?.view || false
                        const create = current?.create || false
                        const edit = current?.edit || false
                        const del = current?.delete || false
                        const any = view || create || edit || del
                        const all = view && create && edit && del

                        const setRow = (patch: Partial<(typeof field.value)[number]>) => {
                          const next = [...field.value]
                          next[index] = { ...current, module: module.key, view, create, edit, delete: del, ...patch }
                          field.onChange(next)
                        }

                        const toggleAll = (checked: boolean) => {
                          setRow({ view: checked, create: checked, edit: checked, delete: checked })
                        }

                        return (
                          <div key={module.key} className="border-b last:border-b-0">
                            <div className="grid grid-cols-[260px_repeat(4,_minmax(72px,1fr))] items-center bg-muted/50 px-4 py-3 text-muted-foreground">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={all ? true : any ? "indeterminate" : false}
                                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                                />
                                <span className="font-medium text-foreground">{module.label}</span>
                              </div>
                              <div className="text-center text-xs font-semibold uppercase tracking-wide">View</div>
                              <div className="text-center text-xs font-semibold uppercase tracking-wide">Create</div>
                              <div className="text-center text-xs font-semibold uppercase tracking-wide">Edit</div>
                              <div className="text-center text-xs font-semibold uppercase tracking-wide">Delete</div>
                            </div>

                            <div className="grid grid-cols-[260px_repeat(4,_minmax(72px,1fr))] items-center px-4 py-4">
                              <div className="flex items-center gap-3 text-sm">
                                <Checkbox
                                  checked={all ? true : any ? "indeterminate" : false}
                                  onCheckedChange={(checked) => toggleAll(Boolean(checked))}
                                />
                                <span>{module.label}</span>
                              </div>
                              <div className="flex justify-center">
                                <Checkbox checked={view} onCheckedChange={(checked) => setRow({ view: Boolean(checked) })} />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox checked={create} onCheckedChange={(checked) => setRow({ create: Boolean(checked) })} />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox checked={edit} onCheckedChange={(checked) => setRow({ edit: Boolean(checked) })} />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox checked={del} onCheckedChange={(checked) => setRow({ delete: Boolean(checked) })} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {fieldState.error && <FormMessage>{fieldState.error.message}</FormMessage>}
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={updateMutation.isPending}>
                  Update Role
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
