import { NextRequest, NextResponse } from "next/server"

import { getServiceRoleSupabase } from "@/app/api/_lib/supabase-admin"

export async function GET() {
  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("site_seo_settings")
    .select("meta_title,meta_description,og_image_url")
    .eq("key", "global")
    .maybeSingle()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      metaTitle: data?.meta_title ?? "",
      metaDescription: data?.meta_description ?? "",
      ogImageUrl: data?.og_image_url ?? "",
    },
  })
}

export async function PATCH(request: NextRequest) {
  const payload = (await request.json()) as {
    metaTitle: string
    metaDescription: string
    ogImageUrl: string
  }

  const supabase = getServiceRoleSupabase()
  const { data, error } = await supabase
    .from("site_seo_settings")
    .upsert(
      {
        key: "global",
        meta_title: payload.metaTitle ?? "",
        meta_description: payload.metaDescription ?? "",
        og_image_url: payload.ogImageUrl ?? "",
      },
      { onConflict: "key" },
    )
    .select("meta_title,meta_description,og_image_url")
    .single()

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: {
      metaTitle: data.meta_title ?? "",
      metaDescription: data.meta_description ?? "",
      ogImageUrl: data.og_image_url ?? "",
    },
  })
}
