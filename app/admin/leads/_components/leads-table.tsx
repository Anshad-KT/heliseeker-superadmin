"use client"

import Link from "next/link"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type LeadRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  message: string | null
  createdAt: string | Date
}

function formatCreatedAt(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString()
}

function renderTruncated(value: string | null, maxWidthClass: string) {
  const text = value?.trim() || "—"
  if (text === "—") {
    return <div className={`${maxWidthClass} truncate`}>{text}</div>
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`${maxWidthClass} truncate`}>{text}</div>
      </TooltipTrigger>
      <TooltipContent className="max-w-[520px] whitespace-pre-wrap break-words">{text}</TooltipContent>
    </Tooltip>
  )
}

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Sl No</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead, index) => (
            <TableRow key={lead.id} className="hover:bg-transparent">
              <TableCell className="text-sm text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">
                {renderTruncated(`${lead.firstName} ${lead.lastName}`.trim(), "max-w-[320px]")}
              </TableCell>
              <TableCell>{renderTruncated(lead.email, "max-w-[280px]")}</TableCell>
              <TableCell>{renderTruncated(lead.phone, "max-w-[200px]")}</TableCell>
              <TableCell>{renderTruncated(lead.message, "max-w-[380px]")}</TableCell>
              <TableCell>{formatCreatedAt(lead.createdAt)}</TableCell>
              <TableCell className="text-right">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/admin/enquiries/${lead.id}`}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  )
}
