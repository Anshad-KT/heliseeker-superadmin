import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"

import { LocaleEnum, LocaleEnumLabel } from "./types"
import { UseFormReturn } from "react-hook-form"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function makeApiCall(
  serverCall: Function,
  {
    afterSuccess,
    afterError,
    afterFinally,
  }: { afterSuccess?: Function; afterError?: Function; afterFinally?: Function }
) {
  try {
    const response = await serverCall()
    if (afterSuccess) afterSuccess(response)
    return response
  } catch (error: any) {
    if (afterError) {
      let message
      if (error.message.includes("services_slug_unique_idx")) {
        message = "This slug is already taken."
        afterError({ message })
      } else {
        message = typeof error === "string" ? error : error?.message || "Error"
        afterError({ message })
      }
    }
  } finally {
    if (afterFinally) afterFinally()
  }
}

export function getImageUrl(url: string) {
  if (!url) return " "
  // If already an absolute URL (e.g., Vercel Blob), return as is
  if (/^https?:\/\//i.test(url)) return url
  // Fallback for legacy Supabase stored paths
  const base = process.env.NEXT_PUBLIC_SUPABASE_BUCKET_URL
  if (base) return `${base}/${url}`

  // If bucket URL env isn't set, infer public object URL from Supabase project URL.
  // Note: Uploads in this repo use the "assets" bucket (see AuthService.uploadProfileImage).
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (supabaseUrl) return `${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/assets/${url.replace(/^\/+/, "")}`

  // Last resort: return as-is (may 404 if it's a relative storage path).
  return url
}

// Helper to map enum values to keys (e.g., 'en' => 'EN')
export const getLocaleKey = (value: string) =>
  Object.keys(LocaleEnum).find(
    (key) => LocaleEnum[key as keyof typeof LocaleEnum] === value
  ) as keyof typeof LocaleEnumLabel

// convert date to MMMM dd, yy
export const formatStringToMMMMddyy = (date: string) =>
  format(new Date(date), "MMMM dd, yy")

export function validateImageCount(
  form: UseFormReturn<any>,
  total: number,
  min: number,
  max: number
): boolean {
  if (total < min) {
    form.setError("img_urls", {
      type: "manual",
      message: `Select at least ${min} image${min > 1 ? "s" : ""}.`,
    })
    return false
  }

  if (total > max) {
    form.setError("img_urls", {
      type: "manual",
      message: `You can only select up to ${max} images.`,
    })
    return false
  }

  form.clearErrors("img_urls")
  return true
}
