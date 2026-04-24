"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home as HomeIcon,
  ChevronRight,
  Building2,
  UsersRound,
  SlidersHorizontal,
  ShieldCheck,
  Files,
  Package,
  LogOut,
  Languages,
  Inbox,
  Tags,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { makeApiCall } from "@/lib/utils"
import { AuthService } from "@/services/api/auth.service"
import { useProfile } from "@/app/contexts/profile.context"
import { useAccess } from "@/app/admin/access/_hooks/use-access"
import Image from "next/image"
import logo from "./logo.png"
import type { LucideIcon } from "lucide-react"

type SubMenuItem = {
  key: string
  icon: LucideIcon
  label: string
  href: string
  kind?: string
}

type MenuItem = {
  key: string
  icon: LucideIcon
  label: string
  href: string
  submenu: SubMenuItem[] | null
  module?: string
}

export const PRIMARY_MENU: MenuItem[] = [
  { key: "home", icon: HomeIcon, label: "Dashboard", href: "/admin/home", submenu: null },
  { key: "centers", icon: Building2, label: "Centers", href: "/admin/centers", submenu: null, module: "centers" },
]

export const MASTER_MENU: MenuItem[] = [
  { key: "departments", icon: Building2, label: "Departments", href: "/admin/masters/departments", submenu: null, module: "department" },
  { key: "services", icon: Package, label: "Services", href: "/admin/masters/services", submenu: null, module: "service" },
  { key: "specialization", icon: SlidersHorizontal, label: "Specialization", href: "/admin/masters/specializations", submenu: null, module: "specialization" },
  { key: "age-groups", icon: UsersRound, label: "Age Groups", href: "/admin/masters/age-groups", submenu: null, module: "ageGroup" },
]

export const SECONDARY_MENU: MenuItem[] = [
  { key: "leads", icon: Inbox, label: "Enquiries", href: "/admin/enquiries", submenu: null, module: "leads" },
  { key: "seo", icon: Tags, label: "SEO", href: "/admin/seo-tags", submenu: null, module: "seo" },
  {
    key: "customers",
    icon: UsersRound,
    label: "Website Users",
    href: "/admin/users",
    submenu: null,
    module: "customers",
  },
  {
    key: "user-management",
    icon: ShieldCheck,
    label: "User Management",
    href: "/admin/user-management/users",
    submenu: [
      { key: "staff-users", icon: UsersRound, label: "User List", href: "/admin/user-management/users" },
      { key: "user-roles", icon: ShieldCheck, label: "User Roles", href: "/admin/access" },
    ],
    module: "userManagement",
  },
  { key: "flat-pages", icon: Files, label: "Flat Pages", href: "/admin/flat-pages", submenu: null, module: "flatPages" },
]

export const MAIN_MENU = [...PRIMARY_MENU, ...MASTER_MENU, ...SECONDARY_MENU]

// Utility to get the default submenu key for a given primary key
export function getDefaultSubmenuKey(primaryKey: string): string {
  const menu = MAIN_MENU.find(item => item.key === primaryKey)
  if (menu && Array.isArray(menu.submenu) && menu.submenu.length > 0) {
    return menu.submenu[0].key
  }
  return ""
}

// type PrimarySidebarProps = {
//   selected: string
//   onSelect: (key: string) => void
// }

type SecondarySidebarProps = {
  selected: string
  secondarySelected: string
  onSecondarySelect: (key: string) => void
  collapsed?: boolean
  onCollapse?: (collapsed: boolean) => void
}

export function PrimarySidebar() {
  const [hovered, setHovered] = useState(false)
  const isExpanded = hovered
  const pathname = usePathname();
  const { toast } = useToast();
  const { setProfile } = useProfile();
  const access = useAccess();
  const navItemBase =
    "flex h-10 items-center rounded-xl transition-all duration-200 relative select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const navItemIcon = "h-5 w-5 shrink-0"
  const navItemLabel = "text-sm font-medium whitespace-nowrap"

  const canView = (moduleKey?: string) => {
    if (!moduleKey) return true
    return access.isReady ? access.can(moduleKey, "view") : true
  }

  const handleLogout = async () => {
    await makeApiCall(() => new AuthService().logout(), {
      afterSuccess: () => {
        window.location.href = "/login";
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
        "fixed top-0 left-0 h-full bg-card/95 backdrop-blur border-r border-border/70 shadow-sm flex flex-col items-stretch py-4 transition-all duration-200 z-50 overflow-hidden",
        isExpanded ? "w-56 px-4" : "w-16 px-2"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ zIndex: 50 }}
    >
      {/* Logo and Admin Panel Name */}
      <div
        className={cn(
          "flex items-center w-full rounded-xl bg-muted/40 px-2 py-2 mb-5",
          isExpanded ? "justify-start" : "justify-center"
        )}
      >
        <Image src={logo} alt="Logo" width={26} height={26} className="w-8 h-8" />
        {isExpanded && <span className="ml-2 font-bold text-lg whitespace-nowrap">Heli Seeker</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar">
        <nav className={cn("flex w-full flex-col gap-1", !isExpanded && "items-center")}>
          {PRIMARY_MENU.filter((item) => canView(item.module)).map((item) => {
            const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  navItemBase,
                  isActive && "bg-primary/10 text-primary shadow-sm",
                  isExpanded ? "w-full px-3 justify-start gap-3" : "w-12 justify-center mx-auto",
                  !isActive && "hover:bg-muted/60 hover:text-foreground"
                )}
                title={item.label}
              >
                <item.icon className={navItemIcon} />
                {isExpanded && (
                  <>
                    <span className={navItemLabel}>{item.label}</span>
                    {hasSubmenu && <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />}
                  </>
                )}
                {!isExpanded && hasSubmenu && (
                  <ChevronRight className="absolute right-2 h-4 w-4 text-muted-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn("my-3 w-full px-2", !isExpanded && "px-0")}>
          <div className={cn("h-px w-full bg-border/70", isExpanded && "mb-2")} />
          {isExpanded && <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Masters</div>}
        </div>

        <nav className={cn("flex w-full flex-col gap-1", !isExpanded && "items-center")}>
          {MASTER_MENU.filter((item) => canView(item.module)).map((item) => {
            const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  navItemBase,
                  isActive && "bg-primary/10 text-primary shadow-sm",
                  isExpanded ? "w-full px-3 justify-start gap-3" : "w-12 justify-center mx-auto",
                  !isActive && "hover:bg-muted/60 hover:text-foreground"
                )}
                title={item.label}
              >
                <item.icon className={navItemIcon} />
                {isExpanded && (
                  <>
                    <span className={navItemLabel}>{item.label}</span>
                    {hasSubmenu && <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />}
                  </>
                )}
                {!isExpanded && hasSubmenu && (
                  <ChevronRight className="absolute right-2 h-4 w-4 text-muted-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className={cn("my-3 w-full px-2", !isExpanded && "px-0")}>
          <div className={cn("h-px w-full bg-border/70", isExpanded && "mb-2")} />
          {isExpanded && <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Users</div>}
        </div>

        <nav className={cn("flex w-full flex-col gap-1 pb-2", !isExpanded && "items-center")}>
          {SECONDARY_MENU.filter((item) => canView(item.module)).map((item) => {
            const hasSubmenu = Array.isArray(item.submenu) && item.submenu.length > 0;
            const isActive = pathname.startsWith(item.href) || (hasSubmenu && item.submenu!.some((sub) => pathname.startsWith(sub.href)))
            return (
              <div key={item.key} className={cn(isExpanded ? "w-full" : "w-12")}>
                <Link
                  href={item.href}
                  className={cn(
                    navItemBase,
                    isActive && "bg-primary/10 text-primary shadow-sm",
                    isExpanded ? "w-full px-3 justify-start gap-3" : "w-12 justify-center mx-auto",
                    !isActive && "hover:bg-muted/60 hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <item.icon className={navItemIcon} />
                  {isExpanded && (
                    <>
                      <span className={navItemLabel}>{item.label}</span>
                      {hasSubmenu && <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />}
                    </>
                  )}
                  {!isExpanded && hasSubmenu && (
                    <ChevronRight className="absolute right-2 h-4 w-4 text-muted-foreground" />
                  )}
                </Link>

                {isExpanded && hasSubmenu && (
                  <div className="relative mt-1 mb-3 ml-11 flex flex-col gap-1 pl-3">
                    <div className="absolute left-0 top-1 bottom-1 w-px bg-border/70" />
                    {item.submenu!.map((sub) => {
                      const subActive = pathname.startsWith(sub.href)
                      return (
                        <Link
                          key={sub.key}
                          href={sub.href}
                          className={cn(
                            "flex h-9 items-center rounded-xl px-3 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                            subActive
                              ? "bg-muted text-foreground font-semibold shadow-sm"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          {sub.label}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
      {/* Quick Logout Button */}
      <button
        onClick={handleLogout}
        className={cn(
          navItemBase,
          "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30",
          isExpanded ? "w-full px-3 justify-start gap-3" : "w-12 justify-center mx-auto"
        )}
        title="Log out"
      >
        <LogOut className={navItemIcon} />
        {isExpanded && <span className={navItemLabel}>Log out</span>}
      </button>
    </div>
  )
}

export function SecondarySidebar({ selected, secondarySelected, onSecondarySelect, collapsed, onCollapse }: SecondarySidebarProps) {
  const menu = MAIN_MENU.find((item) => item.key === selected)
  const [internalExpanded, setInternalExpanded] = useState(true)
  const [hovered, setHovered] = useState(false)
  if (!menu || !Array.isArray(menu.submenu)) return null
  const isControlled = typeof collapsed === 'boolean' && typeof onCollapse === 'function'
  const expanded = isControlled ? !collapsed : internalExpanded
  const setExpanded = isControlled
    ? (v: boolean) => { if (onCollapse) onCollapse(!v); }
    : setInternalExpanded;
  const isExpanded = expanded || hovered

  return (
    <div
      className={cn(
        "fixed top-0 left-16 h-full bg-background/95 backdrop-blur border-r border-border/70 shadow-sm flex flex-col py-8 transition-all duration-200 z-40",
        isExpanded ? "w-56" : "w-16"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ zIndex: 40 }}
    >
      <div className="flex items-center justify-between px-4 mb-6">
        {isExpanded && <div className="font-bold text-lg">{menu.label}</div>}
        <button
          className="ml-auto p-1 rounded hover:bg-muted"
          onClick={() => setExpanded(!expanded)}
          tabIndex={-1}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? "⏴" : "⏵"}
        </button>
      </div>
      <nav className="flex flex-col gap-2 px-2">
        {menu.submenu.map((sub) => (
          <Link
            key={sub.key}
            href={sub.href}
            className={cn(
              "flex items-center rounded-lg px-3 py-2 hover:bg-muted transition",
              secondarySelected === sub.key && "bg-primary/10 text-primary shadow-sm",
              !isExpanded && "justify-center"
            )}
            onClick={() => onSecondarySelect(sub.key)}
            title={sub.label}
          >
            <sub.icon className="w-5 h-5" />
            {isExpanded && <span className="ml-3">{sub.label}</span>}
          </Link>
        ))}
      </nav>
    </div>
  )
}
