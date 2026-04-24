"use client"

import { useMemo, useState } from "react"
import { Eye } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToggleUserActive, useUsers } from "./_hooks/use-users"
import { useRequirePermission } from "@/app/admin/access/_hooks/use-access"
import { UserItem } from "./_types"

function formatValue(value?: string | null) {
  return value?.trim() ? value : "-"
}

function formatDate(value?: string) {
  if (!value) return "-"

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed)
}

function getAge(value?: string) {
  if (!value) return null

  const birthDate = new Date(`${value}T00:00:00`)
  if (Number.isNaN(birthDate.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const hasBirthdayPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())

  if (!hasBirthdayPassed) age -= 1

  return age >= 0 ? age : null
}

function calculateAge(value?: string) {
  const age = getAge(value)

  return age === null ? "-" : String(age)
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{formatValue(value)}</p>
    </div>
  )
}

function WebsiteUserDetailsDialog({
  user,
  onOpenChange,
}: {
  user: UserItem | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Website User Details</DialogTitle>
          <DialogDescription>Profile information submitted from the website account profile.</DialogDescription>
        </DialogHeader>

        {user && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-md border p-4">
              <Avatar className="h-16 w-16 border">
                <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
                <AvatarFallback className="text-lg font-semibold">
                  {(user.guardianName || user.email || "W").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="break-words text-base font-semibold">{formatValue(user.guardianName || user.name)}</p>
                <p className="break-words text-sm text-muted-foreground">
                  {formatValue(user.guardianEmail || user.email)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <DetailField label="Guardian Name" value={user.guardianName} />
              <DetailField label="Guardian Email" value={user.guardianEmail || user.email} />
              <DetailField label="Phone Number" value={user.phoneNumber} />
              <DetailField label="Country of Residency" value={user.countryOfResidency} />
              <DetailField label="Nationality" value={user.nationality} />
              <DetailField label="Child or Participant Name" value={user.childName} />
              <DetailField label="Date of Birth" value={formatDate(user.dateOfBirth)} />
              <DetailField label="Age" value={calculateAge(user.dateOfBirth)} />
              <DetailField label="Primary Language" value={user.primaryLanguage} />
              <DetailField label="Status" value={user.isActive ? "Active" : "Inactive"} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function UsersPage() {
  const access = useRequirePermission("customers", "view")
  const [query, setQuery] = useState("")
  const [ageFilter, setAgeFilter] = useState("")
  const [nationalityFilter, setNationalityFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const { data, isLoading } = useUsers(query)
  const activeMutation = useToggleUserActive()

  const canEdit = access.can("customers", "edit")
  const customers = useMemo(() => (data?.data || []).filter((user) => user.userType === "customer"), [data?.data])
  const nationalities = useMemo(
    () =>
      Array.from(new Set(customers.map((user) => user.nationality?.trim()).filter(Boolean) as string[])).sort(
        (a, b) => a.localeCompare(b),
      ),
    [customers],
  )
  const filteredCustomers = useMemo(() => {
    const normalizedNationality = nationalityFilter.trim().toLowerCase()
    const normalizedAge = Number(ageFilter)

    return customers.filter((user) => {
      const matchesNationality =
        nationalityFilter === "all" || user.nationality?.trim().toLowerCase() === normalizedNationality
      const matchesAge = !ageFilter || getAge(user.dateOfBirth) === normalizedAge

      return matchesNationality && matchesAge
    })
  }, [ageFilter, customers, nationalityFilter])
  const hasActiveFilters = Boolean(ageFilter) || nationalityFilter !== "all"

  if (!access.isReady) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Website Users</h1>
        <p className="text-sm text-muted-foreground">Manage website user accounts from the users table.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Website User List</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_160px_220px_auto]">
            <SearchInput
              placeholder="Search user by name or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Input
              type="number"
              min={0}
              placeholder="Filter age"
              value={ageFilter}
              onChange={(event) => setAgeFilter(event.target.value.replace(/\D/g, ""))}
            />
            <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter nationality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All nationalities</SelectItem>
                {nationalities.map((nationality) => (
                  <SelectItem key={nationality} value={nationality}>
                    {nationality}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAgeFilter("")
                  setNationalityFilter("all")
                }}
              >
                Reset
              </Button>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Sl No</TableHead>
                    <TableHead>Guardian</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Nationality</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="min-w-40 font-medium">
                        {formatValue(user.guardianName || user.name)}
                      </TableCell>
                      <TableCell className="min-w-48">{formatValue(user.guardianEmail || user.email)}</TableCell>
                      <TableCell>{calculateAge(user.dateOfBirth)}</TableCell>
                      <TableCell className="min-w-36">{formatValue(user.nationality)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={user.isActive}
                            disabled={!canEdit}
                            onCheckedChange={(checked) => {
                              if (canEdit) {
                                activeMutation.mutate({ id: user.id, isActive: checked })
                              }
                            }}
                          />
                          <span>{user.isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <WebsiteUserDetailsDialog user={selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)} />
    </div>
  )
}
