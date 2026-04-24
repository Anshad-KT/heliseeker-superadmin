"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"

import { RolesTable } from "./_components/roles-table"
import { useCreateRole, useDeleteRole, useRoles } from "./_hooks/use-roles"
import { createRoleSchema, CreateRoleFormValues } from "./_schemas/role.schema"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"

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

export default function AccessManagementPage() {
  const router = useRouter()
  const access = useRequirePermission("userRoles", "view")
  const { data, isLoading } = useRoles()
  const createMutation = useCreateRole()
  const deleteMutation = useDeleteRole()
  const [search, setSearch] = useState("")

  const buildPermissions = useMemo(
    () => () =>
      MODULES.map((module) => ({
        module: module.key,
        view: false,
        create: false,
        edit: false,
        delete: false,
      })),
    [],
  )

  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      permissions: buildPermissions(),
    },
  })

  const roles = data?.data || []
  const filteredRoles = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return roles
    return roles.filter((role) => {
      const permissionText = role.permissions.map((permission) => permission.module).join(" ")
      return role.name.toLowerCase().includes(term) || permissionText.toLowerCase().includes(term)
    })
  }, [roles, search])

  if (!access.isReady) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User Management</h1>
        <p className="text-sm text-muted-foreground">Create roles and assign module-level access for staff users.</p>
      </div>

      {access.can("userRoles", "create") && (
        <Card>
        <CardHeader>
          <CardTitle>Create Role</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(async (values) => {
                const permissions = values.permissions.filter(
                  (permission) => permission.view || permission.create || permission.edit || permission.delete,
                )
                await createMutation.mutateAsync({
                  name: values.name,
                  permissions,
                })
                form.reset({ name: "", permissions: buildPermissions() })
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
                            {/* Section header (matches attached design) */}
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

                            {/* Permission row */}
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
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  Create Role
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchInput
              placeholder="Search roles by name or module"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading roles...</p>
          ) : (
            <RolesTable
              roles={filteredRoles}
              canEdit={access.can("userRoles", "edit")}
              canDelete={access.can("userRoles", "delete")}
              onEdit={(role) => router.push(`/admin/access/${role.id}`)}
              onDelete={(role) => {
                if (!access.can("userRoles", "delete")) return
                if (window.confirm("Delete this role? This cannot be undone.")) {
                  deleteMutation.mutate({ id: role.id })
                }
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
