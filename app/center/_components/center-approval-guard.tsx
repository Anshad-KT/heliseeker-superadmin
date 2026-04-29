"use client"

import type { ReactNode } from "react"

import { AppLoader } from "@/components/ui/app-loader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCenterApproval } from "../_hooks/use-center-approval"

interface CenterApprovalGuardProps {
  children: ReactNode
  pendingMessage?: string
  rejectedMessage?: string
}

export function CenterApprovalGuard({
  children,
  pendingMessage = "Your center is under review. You will get access after approval.",
  rejectedMessage = "Your center access is not approved. Please contact support.",
}: CenterApprovalGuardProps) {
  const { isLoading, isApproved, isPending, isRejected } = useCenterApproval()

  if (isLoading) {
    return <AppLoader label="Checking approval status..." className="justify-start text-sm" />
  }

  if (isApproved) return <>{children}</>

  if (isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Pending</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{pendingMessage}</CardContent>
      </Card>
    )
  }

  if (isRejected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Restricted</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{rejectedMessage}</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Center Profile Required</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Please complete your center onboarding to continue.
      </CardContent>
    </Card>
  )
}
