"use client"

import Link from "next/link"
import { cn, makeApiCall } from "@/lib/utils"
import { usePathname } from "next/navigation"

import { MASTER_MENU, PRIMARY_MENU, SECONDARY_MENU } from "./sidebar.component"
import { useAccess } from "@/app/admin/access/_hooks/use-access"
import { LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AuthService } from "@/services/api/auth.service"
import { useProfile } from "@/app/contexts/profile.context"

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    const pathname = usePathname();
    const access = useAccess();
    const { toast } = useToast();
    const { setProfile } = useProfile();

    const handleItemClick = () => {
        onClose()
    }

    const handleLogout = async () => {
        onClose()
        await makeApiCall(() => new AuthService().logout(), {
            afterSuccess: () => {
                window.location.href = "/login"
            }
        })
        toast({
            title: "Logged out successfully",
            description: "You have been logged out of your account",
            variant: "success",
        })
        setProfile({});
    }

    return (
        <div
            className={cn(
                "fixed inset-x-0 bottom-0 top-16 z-20 bg-black/60 transition-opacity duration-300 md:hidden",
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={!open}
            onClick={onClose}
        >
            {/* Sidebar */}
            <aside
                className={cn(
                    "absolute left-0 top-0 h-full w-full max-w-xs bg-background shadow-lg flex flex-col p-6 transition-transform duration-300 overflow-hidden",
                    open ? "translate-x-0" : "-translate-x-full"
                )}
                onClick={e => e.stopPropagation()}
            >
                <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar flex flex-col gap-2 pr-1">
                    {PRIMARY_MENU.filter(item => !item.module || !access.isReady || access.can(item.module, "view")).map(item => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-muted transition",
                                pathname && pathname.startsWith(item.href) && "text-purple-one font-semibold"
                            )}
                            onClick={handleItemClick}
                        >
                            {item.icon && <item.icon className="w-5 h-5" />}
                            <span>{item.label}</span>
                        </Link>
                    ))}

                    <div className="mt-3 border-t border-border pt-3">
                        <div className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Masters</div>
                    </div>

                    {MASTER_MENU.filter(item => !item.module || !access.isReady || access.can(item.module, "view")).map(item => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-muted transition",
                                pathname && pathname.startsWith(item.href) && "text-purple-one font-semibold"
                            )}
                            onClick={handleItemClick}
                        >
                            {item.icon && <item.icon className="w-5 h-5" />}
                            <span>{item.label}</span>
                        </Link>
                    ))}

                    <div className="mt-3 border-t border-border pt-3">
                        <div className="px-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users</div>
                    </div>

                    {SECONDARY_MENU.filter(item => !item.module || !access.isReady || access.can(item.module, "view")).map(item => (
                        <div key={item.key}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium hover:bg-muted transition",
                                    pathname && pathname.startsWith(item.href) && "text-purple-one font-semibold"
                                )}
                                onClick={handleItemClick}
                            >
                                {item.icon && <item.icon className="w-5 h-5" />}
                                <span>{item.label}</span>
                            </Link>
                            {Array.isArray(item.submenu) && item.submenu.length > 0 && (
                                <div className="ml-6 mt-1 flex flex-col gap-1">
                                    {item.submenu.map(sub => (
                                        <Link
                                            key={sub.key}
                                            href={sub.href}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted transition",
                                                pathname && pathname.startsWith(sub.href) && "text-purple-one font-semibold"
                                            )}
                                            onClick={handleItemClick}
                                        >
                                            <sub.icon className="w-4 h-4" />
                                            <span>{sub.label}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                <button
                    onClick={handleLogout}
                    className="mt-4 flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                    title="Log out"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Log out</span>
                </button>
            </aside>
        </div>
    )
}
