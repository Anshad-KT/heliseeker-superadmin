"use client"

import { useEffect, useState } from "react"
import { Moon, Sun, LogOut, UserCircle } from "lucide-react"
import { useTheme } from "next-themes"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { getImageUrl, makeApiCall } from "@/lib/utils"
import { AuthService } from "@/services/api/auth.service"
import { useProfile } from "@/app/contexts/profile.context"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export function Header({ onOpenSearch, onOpenMobileSidebar, mobileSidebarOpen }: { onOpenSearch?: () => void; onOpenMobileSidebar?: () => void; mobileSidebarOpen?: boolean }) {
  const [supportOpen, setSupportOpen] = useState(false);
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const { toast } = useToast()
  const { profile: user, setProfile } = useProfile()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const service = new AuthService();
        const profile = await service.getProfile();
        setProfile(profile);
      } catch (err: any) {
        toast({ title: "Error", description: err.message || "Failed to load profile", variant: "destructive" });
      }
    };
    if (!user?.email) fetchProfile();
  }, []);

  // Keyboard shortcut: Ctrl+K to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenSearch && onOpenSearch()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onOpenSearch])

  const handleLogout = async () => {
    await makeApiCall(() => new AuthService().logout(), {
      afterSuccess: () => {
        router.push("/login")
      }
    })
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account",
      variant: "success",
    })
  }

  return (
    <header className="z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-end px-6 gap-1 md:gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          className="md:hidden mr-auto p-2 rounded focus:outline-none hover:bg-muted"
          aria-label={mobileSidebarOpen ? "Close menu" : "Open menu"}
          onClick={onOpenMobileSidebar}
        >
          {mobileSidebarOpen ? (
            <span><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></span>
          ) : (
            <span><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></span>
          )}
        </button>

        {/* Search Button //// commented out for the time being. profile page has proper search indexed // can be implemented in the future*/}
        {/* <Button variant="ghost" size="icon" onClick={onOpenSearch}>
          <Search className="h-4 w-4" />
          <span className="sr-only">Search (Ctrl+K)</span>
        </Button> */}
        
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        {/* <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notifications</span>
        </Button> */}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {user.img ? (
                  <AvatarImage src={getImageUrl(user.img)} alt={user.name || user.email || "Admin"} />
                ) : (
                  <UserCircle className="mx-auto my-auto" />
                )}
                <AvatarFallback>{(user?.name || user?.email || "A")?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user?.name && <p className="text-sm font-medium leading-none">{user?.name}</p>}
                <p className="text-xs leading-none text-muted-foreground">{user?.role}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/profile")} className="cursor-pointer">Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSupportOpen(true)} className="cursor-pointer">Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 dark:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/30 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    {/* Support Modal */}
    <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Support</DialogTitle>
          <DialogDescription>
            Need help or have questions? Please contact us!
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-2">
          <p>For support, reach out to our team and we’ll get back to you as soon as possible.</p>
          <p>
            <span className="font-semibold">Email: </span>
            <a href="mailto:tech@hancod.com" className="text-blue-600 underline">tech@hancod.com</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </header>
  )
}
