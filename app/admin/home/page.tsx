"use client"

import { useState } from "react"
import type { ComponentType } from "react"
import {
  ArrowRight,
  Building2,
  Clock3,
  CircleX,
  MapPin,
  ShieldCheck,
  Users,
  UserPlus,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { useDashboard } from "./_hooks/use-dashboard"

const statusStyles: Record<string, string> = {
  submitted: "border-amber-200 bg-amber-50 text-amber-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  deactive: "border-slate-200 bg-slate-100 text-slate-700",
  blacklisted: "border-slate-200 bg-slate-100 text-slate-700",
}

function DashboardStatCard({
  title,
  value,
  icon: Icon,
  accentClassName,
  hint,
}: {
  title: string
  value: number
  icon: ComponentType<{ className?: string }>
  accentClassName: string
  hint?: string
}) {
  return (
    <Card className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_14px_45px_-32px_rgba(15,23,42,0.35)]">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-4">
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-[14px] text-white shadow-md", accentClassName)}>
            <Icon className="h-5 w-5" />
          </div>
          {hint ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
              {hint}
            </span>
          ) : null}
        </div>
        <div className="px-4 pb-4">
          <p className="text-[15px] font-semibold text-slate-600">{title}</p>
          <p className="mt-1.5 text-[28px] font-semibold leading-none tracking-tight text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminHomePage() {
  const { data, isLoading } = useDashboard()
  const [showAllLocations, setShowAllLocations] = useState(false)
  const [showAllCenters, setShowAllCenters] = useState(false)
  const [showAllUsers, setShowAllUsers] = useState(false)

  if (isLoading || !data) {
    return <AppLoader label="Loading dashboard..." className="px-4 py-6 text-sm" />
  }

  const visibleLocations = showAllLocations ? data.centersByLocation : data.centersByLocation.slice(0, 5)
  const visibleCenters = showAllCenters ? data.recentCenters : data.recentCenters.slice(0, 5)
  const visibleUsers = showAllUsers ? data.users : data.users.slice(0, 5)

  return (
    <div className="space-y-6 rounded-[28px] bg-[linear-gradient(180deg,#f8fbff_0%,#f3f7fc_100%)] px-2 py-2 md:px-3">
      <div className="rounded-[28px] border border-slate-200/80 bg-white/80 px-6 py-7 shadow-[0_18px_60px_-35px_rgba(15,23,42,0.28)] backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Operational overview</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              A cleaner snapshot of center activity, location performance, and recent user growth.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">Top city</p>
              <p className="text-sm font-semibold text-slate-800">{data.centersByLocation[0]?.location || "Unknown"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Total Centers"
          value={data.centers.total}
          icon={Building2}
          accentClassName="bg-[linear-gradient(135deg,#4355db_0%,#5b6cff_100%)]"
          hint={`${data.centersByLocation.length} cities`}
        />
        <DashboardStatCard
          title="Pending Centers"
          value={data.centers.submitted}
          icon={Clock3}
          accentClassName="bg-[linear-gradient(135deg,#fb923c_0%,#f97316_100%)]"
        />
        <DashboardStatCard
          title="Active Centers"
          value={data.centers.active}
          icon={ShieldCheck}
          accentClassName="bg-[linear-gradient(135deg,#22c55e_0%,#16a34a_100%)]"
        />
        <DashboardStatCard
          title="Rejected Centers"
          value={data.centers.rejected}
          icon={CircleX}
          accentClassName="bg-[linear-gradient(135deg,#fb7185_0%,#ef4444_100%)]"
        />
        <DashboardStatCard
          title="Website Users"
          value={data.totalUsers}
          icon={Users}
          accentClassName="bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_100%)]"
        />
        <DashboardStatCard
          title="New Users in 7 Days"
          value={data.newUsersLast7Days}
          icon={UserPlus}
          accentClassName="bg-[linear-gradient(135deg,#06b6d4_0%,#0891b2_100%)]"
          hint="Last 7 days"
        />
        <DashboardStatCard
          title="Total Request Referrals"
          value={data.leadsCount}
          icon={ArrowRight}
          accentClassName="bg-[linear-gradient(135deg,#a855f7_0%,#d946ef_100%)]"
        />
        <DashboardStatCard
          title="Cities Covered"
          value={data.centersByLocation.length}
          icon={MapPin}
          accentClassName="bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_100%)]"
        />
      </div>

      <Card className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_-35px_rgba(15,23,42,0.28)]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <CardTitle className="text-[28px] text-slate-900">Location Performance Table</CardTitle>
            <p className="mt-2 text-sm text-slate-500">Local areas are grouped under major city names.</p>
          </div>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 px-4"
            onClick={() => setShowAllLocations((current) => !current)}
          >
            {showAllLocations ? "Show Less" : "View All"}
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {data.centersByLocation.length === 0 ? (
            <p className="text-sm text-muted-foreground">No location data found.</p>
          ) : (
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Centers</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLocations.map((item) => (
                  <TableRow key={item.location}>
                    <TableCell className="font-medium text-slate-800">{item.location}</TableCell>
                    <TableCell className="text-right font-semibold text-slate-700">{item.total}</TableCell>
                    <TableCell className="text-right text-emerald-600">{item.active}</TableCell>
                    <TableCell className="text-right text-amber-600">{item.pending}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <Card className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_-35px_rgba(15,23,42,0.28)]">
          <CardHeader className="flex flex-col gap-4 border-b border-slate-100 p-5 pb-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <CardTitle className="text-2xl text-slate-900 sm:text-[28px]">Center Management</CardTitle>
              <p className="mt-2 text-sm text-slate-500">Latest centers and approval statuses.</p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl border-slate-200 px-4 sm:w-auto"
              onClick={() => setShowAllCenters((current) => !current)}
            >
              {showAllCenters ? "Show Less" : "View All"}
            </Button>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            {data.recentCenters.length === 0 ? (
              <p className="text-sm text-muted-foreground">No centers found.</p>
            ) : (
              <>
                <div className="mt-2 space-y-3 md:hidden">
                  {visibleCenters.map((center) => (
                    <div key={center.id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{center.centerName}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{center.location || "Unknown"}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 rounded-full px-3 py-1 text-xs capitalize", statusStyles[center.approvalStatus] || statusStyles.submitted)}
                        >
                          {center.approvalStatus}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline" className="mt-3 w-full rounded-xl border-slate-200" onClick={() => {
                        window.location.href = `/admin/centers/${center.id}`
                      }}>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
                <Table className="mt-2 hidden md:table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Center Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleCenters.map((center) => (
                      <TableRow key={center.id}>
                        <TableCell className="font-medium text-slate-800">{center.centerName}</TableCell>
                        <TableCell>{center.location}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("capitalize rounded-full px-3 py-1 text-xs", statusStyles[center.approvalStatus] || statusStyles.submitted)}
                          >
                            {center.approvalStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="rounded-xl border-slate-200" onClick={() => {
                          window.location.href = `/admin/centers/${center.id}`
                        }}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_-35px_rgba(15,23,42,0.28)]">
          <CardHeader className="border-b border-slate-100 p-5 pb-5 sm:p-6">
            <CardTitle className="text-2xl text-slate-900 sm:text-[28px]">Recent Users</CardTitle>
            <p className="mt-2 text-sm text-slate-500">Latest website users added to the platform.</p>
          </CardHeader>
          <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
            {data.users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              <div className="mt-2 space-y-3">
                {data.users.slice(0, 6).map((user, index) => (
                  <div
                    key={user.id ?? `${user.email ?? "user"}-${index}`}
                    className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{user.profileName || user.email || "Unnamed User"}</p>
                      <p className="truncate text-xs text-slate-500">{user.email || user.phoneNumber || "No contact details"}</p>
                    </div>
                    <div className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-sky-600 shadow-sm">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-slate-400">Showing the latest {Math.min(data.users.length, 6)} users.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_60px_-35px_rgba(15,23,42,0.28)]">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-5">
          <CardTitle className="text-[28px] text-slate-900">Website Users</CardTitle>
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 px-4"
            onClick={() => setShowAllUsers((current) => !current)}
          >
            {showAllUsers ? "Show Less" : "View All"}
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {data.users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            <Table className="mt-2">
              <TableHeader>
                <TableRow>
                  <TableHead>Si.no</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Profile Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user, index) => (
                  <TableRow key={user.id ?? `${user.email ?? "user"}-${index}`}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>{user.phoneNumber || "—"}</TableCell>
                    <TableCell>{user.profileName || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Showing {visibleUsers.length} of {data.users.length} users.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
