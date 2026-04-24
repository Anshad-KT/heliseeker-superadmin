import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

const MAX_BYTES = 5 * 1024 * 1024

function getExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName
  const fromType = file.type.split("/").pop()?.toLowerCase()
  if (fromType && /^[a-z0-9.+-]+$/.test(fromType)) return fromType.replace("jpeg", "jpg")
  return "png"
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData().catch(() => null)
    const file = formData?.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "Missing file" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Only image uploads are allowed" }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: "Image is too large (max 5MB)" }, { status: 400 })
    }

    const ext = getExtension(file)
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const fileName = `og_${id}.${ext}`

    // Vercel serverless filesystem is not writable; store in Vercel Blob.
    // Requires `BLOB_READ_WRITE_TOKEN` to be set in Vercel env vars.
    const pathname = `uploads/seo/${fileName}`
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    })

    return NextResponse.json({ url: blob.url, path: blob.pathname ?? pathname })
  } catch (e: any) {
    const message = e?.message || "Failed to upload OG image"
    return NextResponse.json({ message }, { status: 500 })
  }
}
