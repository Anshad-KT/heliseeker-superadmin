"use client"

import { Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function ForgotPasswordShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Package className="h-10 w-10 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold">Admin Panel</h1>
          <p className="mt-2 text-muted-foreground">Recover access with email OTP verification</p>
        </div>
        <Card className="border-border shadow-lg">
          <CardContent className="space-y-5 pt-6">{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}
