import { NextResponse } from "next/server"

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

  return NextResponse.json(
    {
      title: data?.meta_title ?? "",
      description: data?.meta_description ?? "",
      image: data?.og_image_url ?? "",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    }
  )
}
