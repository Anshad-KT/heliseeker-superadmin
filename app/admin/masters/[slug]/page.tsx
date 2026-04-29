"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { use, useMemo, useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"

import { useCreateMasterItem, useDeleteMasterItem, useMasterItems, useUpdateMasterItem } from "../_hooks/use-masters"
import { MasterTable } from "../_components/master-table"
import { useToast } from "@/hooks/use-toast"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"

const masterConfig = {
  departments: {
    title: "Departments",
    description: "Create and manage departments shown in the center portal dropdown.",
    nameLabel: "Department Name",
  },
  services: {
    title: "Services",
    description: "Create and manage services listed in the center portal dropdown.",
    nameLabel: "Service Name",
  },
  specializations: {
    title: "Specializations",
    description: "Create and manage specializations for center listings.",
    nameLabel: "Specialization Name",
  },
  "age-groups": {
    title: "Age Groups",
    description: "Create and manage age group ranges available in the portal.",
    nameLabel: "Age Group Name",
  },
} as const

type MasterKey = keyof typeof masterConfig

const masterItemSchema = z.object({
  name: z.string().trim().min(2),
  description: z.string().optional(),
  departmentId: z.string().optional(),
  ageGroupId: z.string().optional(),
  fromAge: z.number().int().min(0).optional(),
  toAge: z.number().int().min(0).optional(),
  unit: z.enum(["month", "year"]).optional(),
  status: z.boolean().optional(),
})

type MasterFormValues = z.infer<typeof masterItemSchema>

type SearchableOption = {
  value: string
  label: string
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full min-w-0 justify-between gap-2 overflow-hidden"
          disabled={disabled}
        >
          <span className="min-w-0 flex-1 truncate text-left" title={selected?.label || placeholder}>
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")}
                />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default function MasterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const config = masterConfig[slug as MasterKey]
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tableQuery, setTableQuery] = useState("")

  const { data, isLoading } = useMasterItems(slug)
  const createMutation = useCreateMasterItem(slug)
  const updateMutation = useUpdateMasterItem(slug)
  const deleteMutation = useDeleteMasterItem(slug)
  const isSaving = createMutation.isPending || updateMutation.isPending

  const departmentQuery = useMasterItems("departments")
  const ageGroupQuery = useMasterItems("age-groups")

  const form = useForm<MasterFormValues>({
    resolver: zodResolver(masterItemSchema),
    defaultValues: { name: "", description: "", departmentId: "", ageGroupId: "none", fromAge: undefined, toAge: undefined, unit: "year", status: true },
  })

  const moduleKey =
    slug === "departments"
      ? "department"
      : slug === "services"
      ? "service"
      : slug === "specializations"
      ? "specialization"
      : "ageGroup"

  const access = useRequirePermission(moduleKey, "view")

  const entityLabel = config?.title?.endsWith("s")
    ? config.title.slice(0, -1)
    : config?.title || "Item"

  const handleAuthError = (err: any) => {
    const message = err?.message || "Error"
    if (/not authenticated|unauthorized/i.test(message)) {
      toast({
        title: "Session expired",
        description: "Please log in again.",
        variant: "destructive",
      })
      router.push("/login")
      return true
    }
    return false
  }

  useEffect(() => {
    if (!editingId) {
      form.reset({ name: "", description: "", departmentId: "", ageGroupId: "none", fromAge: undefined, toAge: undefined, unit: "year", status: true })
      return
    }

    const current = (data?.data || []).find((item) => item.id === editingId)
    if (!current) return
    const rawName = current.service_name ?? current.name ?? ""
    form.reset({
      name: rawName,
      description: current.description ?? "",
      departmentId: current.department_id ?? "",
      ageGroupId: current.age_group_id ?? "none",
      fromAge: typeof current.from_age === "number" ? current.from_age : current.from_age ? Number(current.from_age) : undefined,
      toAge: typeof current.to_age === "number" ? current.to_age : current.to_age ? Number(current.to_age) : undefined,
      unit: current.unit === "month" || current.unit === "year" ? current.unit : "year",
      status: typeof current.status === "boolean" ? current.status : current.status === null || current.status === undefined ? true : Boolean(current.status),
    })
  }, [editingId, form, data?.data])

  useEffect(() => {
    if (!editingId) return
    const id = "master-item-name"
    requestAnimationFrame(() => {
      const el = document.getElementById(id)
      el?.scrollIntoView({ behavior: "smooth", block: "center" })
      form.setFocus("name")
    })
  }, [editingId, form])

  const items = useMemo(() => {
    if (!config) return []
    const departments = departmentQuery.data?.data || []
    const ageGroups = ageGroupQuery.data?.data || []
    const departmentMap = new Map(departments.map((item) => [item.id, item.name]))
    const ageGroupMap = new Map(ageGroups.map((item) => [item.id, item.name]))

    return (data?.data || []).map((item) => ({
      id: item.id,
      name: item.service_name ?? item.name ?? "",
      description: item.description ?? "",
      departmentName: item.department_id ? departmentMap.get(item.department_id) : undefined,
      ageGroupName: item.age_group_id ? ageGroupMap.get(item.age_group_id) : undefined,
      fromAge: item.from_age ?? undefined,
      toAge: item.to_age ?? undefined,
      unit: item.unit ?? undefined,
      status: item.status ?? undefined,
    }))
  }, [data?.data, departmentQuery.data?.data, ageGroupQuery.data?.data])

  const filteredItems = useMemo(() => {
    if (!tableQuery.trim()) return items
    const term = tableQuery.trim().toLowerCase()
    return items.filter((item) =>
      [item.name, item.description, item.departmentName, item.ageGroupName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term)),
    )
  }, [items, tableQuery])

  if (!access.isReady) {
    return <AppLoader label="Loading..." className="justify-start text-sm" imageClassName="h-9 w-9" />
  }

  if (!config) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Masters</h1>
        <p className="text-sm text-muted-foreground">Unknown master type.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{config.title}</h1>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>

      {access.can(moduleKey, "create") && (
        <Card>
        <CardHeader>
          <CardTitle>{editingId ? `Edit ${config.title}` : `Create ${config.title}`}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={form.handleSubmit(async (values) => {
                const cleanedName = values.name.trim()

                if (slug === "services" && !values.departmentId) {
                  form.setError("departmentId", { message: "Department is required." })
                  return
                }

                if (slug === "age-groups") {
                  if (values.fromAge === undefined) {
                    form.setError("fromAge", { message: "From age is required." })
                    return
                  }
                  if (values.toAge === undefined) {
                    form.setError("toAge", { message: "To age is required." })
                    return
                  }
                  if (values.unit === undefined) {
                    form.setError("unit", { message: "Unit is required." })
                    return
                  }
                  if (values.toAge < values.fromAge) {
                    form.setError("toAge", { message: "To age must be >= from age." })
                    return
                  }
                }

                const payload =
                  slug === "services"
                    ? {
                        service_name: cleanedName,
                        description: values.description || undefined,
                        department_id: values.departmentId || undefined,
                        age_group_id: values.ageGroupId === "none" ? undefined : values.ageGroupId,
                      }
                    : slug === "age-groups"
                    ? {
                        name: cleanedName,
                        description: values.description || undefined,
                        from_age: values.fromAge,
                        to_age: values.toAge,
                        unit: values.unit,
                        status: values.status ?? true,
                      }
                    : {
                        name: cleanedName,
                        description: values.description || undefined,
                      }

                try {
                  if (editingId) {
                    await updateMutation.mutateAsync({ id: editingId, ...payload })
                    toast({
                      title: "Updated",
                      description: `${entityLabel} updated successfully.`,
                      variant: "success",
                    })
                    setEditingId(null)
                  } else {
                    await createMutation.mutateAsync(payload)
                    toast({
                      title: "Created",
                      description: `${entityLabel} created successfully.`,
                      variant: "success",
                    })
                  }
                  form.reset({ name: "", description: "", departmentId: "", ageGroupId: "none", fromAge: undefined, toAge: undefined, unit: "year", status: true })
                } catch (err: any) {
                  if (handleAuthError(err)) return
                  toast({
                    title: "Error",
                    description: err?.message || `Failed to save ${entityLabel.toLowerCase()}.`,
                    variant: "destructive",
                  })
                }
              })}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{config.nameLabel}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        id="master-item-name"
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {slug === "age-groups" && (
                <>
                  <FormField
                    control={form.control}
                    name="fromAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              if (e.target.value === "") return field.onChange(undefined)
                              const n = Number(e.target.value)
                              field.onChange(Number.isNaN(n) ? undefined : n)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="toAge"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>To Age</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={field.value ?? ""}
                            onChange={(e) => {
                              if (e.target.value === "") return field.onChange(undefined)
                              const n = Number(e.target.value)
                              field.onChange(Number.isNaN(n) ? undefined : n)
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <Select defaultValue={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="month">Month</SelectItem>
                            <SelectItem value="year">Year</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2">
                        <div>
                          <FormLabel>Status</FormLabel>
                          <p className="text-xs text-muted-foreground">Toggle to activate/deactivate this age group.</p>
                        </div>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                            <span className="text-sm">{(field.value ?? true) ? "Active" : "Inactive"}</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {slug === "services" && (
                <FormField
                  control={form.control}
                  name="departmentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || ""}
                          onChange={field.onChange}
                          options={(departmentQuery.data?.data || []).map((item) => ({
                            value: item.id,
                            label: item.name,
                          }))}
                          placeholder="Select department"
                          searchPlaceholder="Search department..."
                          emptyMessage="No departments found."
                          disabled={departmentQuery.isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {slug !== "specializations" && slug !== "age-groups" && (
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {slug === "services" && (
                <FormField
                  control={form.control}
                  name="ageGroupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Group (Optional)</FormLabel>
                      <FormControl>
                        <SearchableSelect
                          value={field.value || "none"}
                          onChange={field.onChange}
                          options={[
                            { value: "none", label: "No age group" },
                            ...(ageGroupQuery.data?.data || []).map((item) => ({
                              value: item.id,
                              label: item.name,
                            })),
                          ]}
                          placeholder="Select age group"
                          searchPlaceholder="Search age group..."
                          emptyMessage="No age groups found."
                          disabled={ageGroupQuery.isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex items-center gap-2 md:col-span-2">
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Update" : "Create"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{config.title} Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <SearchInput
              placeholder={`Search ${config.title.toLowerCase()}`}
              value={tableQuery}
              onChange={(event) => setTableQuery(event.target.value)}
            />
          </div>
          {isLoading ? (
            <AppLoader
              label={`Loading ${config.title.toLowerCase()}...`}
              className="justify-start text-sm"
              imageClassName="h-9 w-9"
            />
          ) : slug === "age-groups" && filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No age groups found.</p>
          ) : (
            <MasterTable
              items={filteredItems}
              getViewHref={(id) => `/admin/masters/${slug}/${id}`}
              onEdit={(id) => setEditingId(id)}
              onDelete={(id) => {
                if (!access.can(moduleKey, "delete")) return
                if (window.confirm("Delete this item? This cannot be undone.")) {
                  deleteMutation.mutateAsync({ id })
                    .then(() => {
                      toast({
                        title: "Deleted",
                        description: `${entityLabel} deleted successfully.`,
                        variant: "success",
                      })
                    })
                    .catch((err: any) => {
                      if (handleAuthError(err)) return
                      toast({
                        title: "Error",
                        description: err?.message || `Failed to delete ${entityLabel.toLowerCase()}.`,
                        variant: "destructive",
                      })
                    })
                }
              }}
              canEdit={access.can(moduleKey, "edit")}
              canDelete={access.can(moduleKey, "delete")}
              showDepartment={slug === "services"}
              showAgeGroup={slug === "services"}
              showAgeRange={slug === "age-groups"}
              showStatus={slug === "age-groups"}
              showDescription={slug !== "specializations"}
              nameLabel={config.nameLabel}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
