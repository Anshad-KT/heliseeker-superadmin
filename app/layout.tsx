import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { getImageUrl } from "@/lib/utils"
import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

const inter = Inter({ subsets: ["latin"] })

function getSiteUrl() {
  const explicit =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  return explicit || "http://localhost:3000"
}

function getOpenGraphImageUrl() {
  const explicit = process.env.NEXT_PUBLIC_OG_IMAGE_URL
  if (explicit) return explicit

  // Store the OG image in the Supabase "assets" bucket and set its path here.
  // Example: `og/og-image.png`
  const bucketPath = process.env.NEXT_PUBLIC_OG_IMAGE_PATH || "og/og-image.png"
  return getImageUrl(bucketPath)
}

function resolveOgImageUrl(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return ""
  if (trimmed.startsWith("data:image/")) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return getImageUrl(trimmed.replace(/^\/+/, ""))
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = new URL(getSiteUrl())
  const defaults = {
    title: "Heliseeker Superadmin",
    description: "Heliseeker Superadmin admin panel.",
  }
  const icons: Metadata["icons"] = {
    icon: [{ url: "/logo.png" }],
    shortcut: [{ url: "/logo.png" }],
    apple: [{ url: "/logo.png" }],
  }

  try {
    const supabase = getServiceRoleSupabase()
    const { data } = await supabase
      .from("site_seo_settings")
      .select("meta_title,meta_description,og_image_url")
      .eq("key", "global")
      .maybeSingle()

    // Always keep the admin website title fixed.
    const title = defaults.title
    const description = data?.meta_description?.trim() || defaults.description
    const ogImage = resolveOgImageUrl(data?.og_image_url) || getOpenGraphImageUrl()

    return {
      metadataBase,
      title,
      description,
      icons,
      openGraph: {
        type: "website",
        title,
        description,
        images: ogImage ? [{ url: ogImage, alt: title }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : [],
      },
    }
  } catch {
    const ogImage = getOpenGraphImageUrl()
    return {
      metadataBase,
      title: defaults.title,
      description: defaults.description,
      icons,
      openGraph: {
        type: "website",
        title: defaults.title,
        description: defaults.description,
        images: ogImage ? [{ url: ogImage, alt: defaults.title }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title: defaults.title,
        description: defaults.description,
        images: ogImage ? [ogImage] : [],
      },
    }
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
