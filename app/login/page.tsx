"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import * as z from "zod"
import { Sun, Moon, Package, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useTRPC } from "@/trpc/client"
import { createClient } from "@/utils/supabase/client"

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
})

type FormValues = z.infer<typeof formSchema>

export default function LoginPage() {
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const { toast } = useToast()
    const trpc = useTRPC()
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        let active = true
        const supabase = createClient()
        const checkSession = async () => {
            const { data } = await supabase.auth.getUser()
            if (!active) return
            if (data?.user) {
                router.replace("/admin/home")
            }
        }
        checkSession()
        return () => {
            active = false
        }
    }, [router])

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    })

    const loginMutation = useMutation(
        trpc.auth.login.mutationOptions({
            onSuccess: (result) => {
                const mustChangePassword = Boolean(
                    (result as any)?.data?.user?.user_metadata?.must_change_password
                )
                toast({
                    title: "Login Successful",
                    description: mustChangePassword
                        ? "Please update your password to continue."
                        : "Redirecting to dashboard...",
                    variant: "success",
                })
                form.reset()
                router.replace(mustChangePassword ? "/admin/change-password" : "/admin/home")
                router.refresh()
            },
            onError: (error) => {
                toast({
                    title: "Login Failed",
                    description: error.message || "Invalid credentials. Please try again.",
                    variant: "destructive",
                })
            },
        }),
    )

    const onSubmit = async (values: FormValues) => {
        loginMutation.mutate(values)
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="absolute top-4 right-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="rounded-full"
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <div className="flex items-center justify-center mb-4">
                        <Package className="h-10 w-10 text-orange-500" />
                    </div>
                    <h1 className="text-3xl font-bold">Admin Panel</h1>
                    <p className="text-muted-foreground mt-2">Sign in to access your dashboard</p>
                </div>
                <Card className="border-border shadow-lg">
                    {/* <CardHeader>
                        <CardTitle className="text-2xl">Login</CardTitle>
                        <CardDescription>Enter your credentials to continue</CardDescription>
                    </CardHeader> */}
                    <div className="mt-6">
                    </div>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="Enter your email"
                                    {...form.register("email")}
                                    required
                                    className="border-border"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Enter your password"
                                        {...form.register("password")}
                                        required
                                        className="border-border pr-10"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || loginMutation.isPending}>
                                {(form.formState.isSubmitting || loginMutation.isPending) ? "Signing in..." : "Sign In"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    )
}
