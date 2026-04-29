"use client"

import { useState } from "react"

import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { ReferralHistory } from "./_components/referral-history"
import { usePatients, useTogglePatientStatus } from "./_hooks/use-patients"

export default function PatientsPage() {
  const [query, setQuery] = useState("")
  const { data, isLoading } = usePatients(query)
  const mutation = useTogglePatientStatus()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">User (Patient) Management</h1>
        <p className="text-sm text-muted-foreground">View all users, deactivate accounts, and review referral usage.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search patient by name or email"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          {isLoading ? (
            <AppLoader label="Loading users..." className="justify-start text-sm" imageClassName="h-9 w-9" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Referral History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data || []).map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={patient.isActive}
                          onCheckedChange={(checked) => mutation.mutate({ id: patient.id, isActive: checked })}
                        />
                        <span>{patient.isActive ? "Active" : "Deactivated"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">View</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{patient.name} - Referral Usage</DialogTitle>
                          </DialogHeader>
                          <ReferralHistory patient={patient} />
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
