"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useSearchParams } from "next/navigation"

import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

import { FilterList } from "./_components/filter-list"
import { useCreateSearchFilter, useReorderSearchFilters, useSearchFilters, useUpdateSearchFilter } from "./_hooks/use-search-filters"
import { createSearchFilterSchema, CreateSearchFilterFormValues } from "./_schemas/search-filter.schema"

export default function SearchFiltersPage() {
  const searchParams = useSearchParams()
  const queryKind = searchParams.get("kind")
  const validKinds = ["department", "therapy", "service", "ageRange", "location", "language"] as const
  const defaultKind: CreateSearchFilterFormValues["kind"] = validKinds.includes(queryKind as (typeof validKinds)[number])
    ? (queryKind as CreateSearchFilterFormValues["kind"])
    : "department"
  const { data, isLoading } = useSearchFilters()
  const createMutation = useCreateSearchFilter()
  const updateMutation = useUpdateSearchFilter()
  const reorderMutation = useReorderSearchFilters()

  const form = useForm<CreateSearchFilterFormValues>({
    resolver: zodResolver(createSearchFilterSchema),
    defaultValues: {
      kind: defaultKind,
      name: "",
      description: "",
      parentId: "none",
      enabled: true,
      fromAge: undefined,
      toAge: undefined,
      unit: "year",
    },
  })

  useEffect(() => {
    if (validKinds.includes(queryKind as (typeof validKinds)[number])) {
      form.setValue("kind", queryKind as CreateSearchFilterFormValues["kind"], { shouldDirty: false })
    }
  }, [form, queryKind])

  const parentOptions = useMemo(() => data?.data || [], [data?.data])
  const selectedKind = form.watch("kind")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Search Filters & Issue Categories</h1>
        <p className="text-sm text-muted-foreground">Manage departments, therapies, services, age ranges, map locations and languages.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Search Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={form.handleSubmit(async (values) => {
                const payload = {
                  kind: values.kind,
                  name: values.name,
                  parentId: values.parentId === "none" ? undefined : values.parentId,
                  description: values.description || undefined,
                  enabled: values.enabled ?? true,
                  ...(values.kind === "ageRange"
                    ? { fromAge: values.fromAge, toAge: values.toAge, unit: values.unit }
                    : {}),
                }
                await createMutation.mutateAsync(payload)
                form.reset({ kind: "department", name: "", description: "", parentId: "none", enabled: true, fromAge: undefined, toAge: undefined, unit: "year" })
              })}
            >
              <FormField
                control={form.control}
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Filter Kind</FormLabel>
                    <Select defaultValue={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="department">Department</SelectItem>
                        <SelectItem value="therapy">Therapy</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="ageRange">Age Range</SelectItem>
                        <SelectItem value="location">Location</SelectItem>
                        <SelectItem value="language">Language</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{selectedKind === "ageRange" ? "Age Range Name" : "Name"}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedKind === "ageRange" && (
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
                </>
              )}

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description File/Details</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Parent (Optional)</FormLabel>
                    <Select defaultValue={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent</SelectItem>
                        {parentOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border px-3 py-2 md:col-span-2">
                    <div>
                      <FormLabel>Status</FormLabel>
                      <p className="text-xs text-muted-foreground">Toggle to enable/disable this filter.</p>
                    </div>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                        <span className="text-sm">{(field.value ?? true) ? "Enabled" : "Disabled"}</span>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" className="md:col-span-2">Create Filter</Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Filter Stack</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <AppLoader label="Loading search filters..." className="justify-start text-sm" imageClassName="h-9 w-9" />
          ) : (
            <FilterList
              items={data?.data || []}
              onToggle={(id, enabled) => updateMutation.mutate({ id, enabled })}
              onReorder={(items) => reorderMutation.mutate(items)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
