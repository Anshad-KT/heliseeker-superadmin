"use client"

import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { z } from "zod"

import { AppLoader } from "@/components/ui/app-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useTRPC } from "@/trpc/client"
import { useCenterApproval } from "@/app/center/_hooks/use-center-approval"

const onboardingSchema = z.object({
  centerName: z.string().min(2, "Center name is required"),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().min(4, "Phone is too short").optional().or(z.literal("")),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export default function OnboardingClient() {
  const { toast } = useToast()
  const trpc = useTRPC()
  const approvalQuery = useCenterApproval()

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      centerName: "",
      contactEmail: "",
      contactPhone: "",
    },
  })

  const requestMutation = useMutation(
    trpc.centers.requestOnboarding.mutationOptions({
      onSuccess: () => {
        toast({
          title: "Request submitted",
          description: "Your onboarding request is now pending approval.",
          variant: "success",
        })
        approvalQuery.refetch()
      },
      onError: (error) => {
        toast({
          title: "Submission failed",
          description: error.message || "Please try again.",
          variant: "destructive",
        })
      },
    }),
  )

  const status = approvalQuery.status
  const isNew = useMemo(() => !status, [status])

  if (approvalQuery.isLoading) {
    return <AppLoader label="Loading onboarding..." className="text-sm" />
  }

  if (status === "pending") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Request Submitted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Your onboarding request has been submitted and is pending approval.</p>
            <p>Please wait for confirmation from the admin team.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === "active") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Approved</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Your center profile is approved. You can access the center portal now.</p>
            <Button asChild>
              <a href="/center">Go to Center Portal</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isNew) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Status</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Your onboarding status is <span className="font-medium">{status}</span>.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Center Onboarding</h1>
        <p className="text-sm text-muted-foreground">Submit your center details to start the approval process.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onboarding Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => {
                requestMutation.mutate({
                  centerName: values.centerName,
                  contactEmail: values.contactEmail || undefined,
                  contactPhone: values.contactPhone || undefined,
                })
              })}
            >
              <FormField
                control={form.control}
                name="centerName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Center Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="md:col-span-2" disabled={requestMutation.isPending}>
                {requestMutation.isPending ? "Submitting..." : "Submit for Approval"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
