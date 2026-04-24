/// <reference types="https://deno.land/x/supabase_functions@1.3.3/src/edge-runtime.d.ts" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Payload = {
  name: string;
  email: string;
  role: "super_admin" | "manager" | "operator";
  redirectTo?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ message: "Missing Supabase service role configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const postmarkApiKey = Deno.env.get("POSTMARK_API_KEY");
    const postmarkFrom = Deno.env.get("POSTMARK_FROM_EMAIL");
    const superadminBaseUrl =
      Deno.env.get("SUPERADMIN_APP_URL") ??
      Deno.env.get("NEXT_PUBLIC_SUPERADMIN_URL") ??
      "https://heli-seeker-superadmin.vercel.app";
    if (!postmarkApiKey || !postmarkFrom) {
      return new Response(JSON.stringify({ message: "Missing Postmark configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    const name = payload.name?.trim();
    const email = payload.email?.trim().toLowerCase();
    const role = payload.role;

    if (!name || !email || !role) {
      return new Response(JSON.stringify({ message: "Name, email and role are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: existingAdmin, error: existingError } = await supabase
      .from("admins")
      .select("admin_id")
      .eq("email", email)
      .maybeSingle();

    if (existingError) {
      return new Response(JSON.stringify({ message: existingError.message || "Failed to check existing admin." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingAdmin?.admin_id) {
      return new Response(JSON.stringify({ message: "An admin with this email already exists." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tempPassword = `Temp@${crypto.randomUUID().slice(0, 12)}`;

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { must_change_password: true },
    });

    if (createError || !created?.user?.id) {
      const msg = createError?.message || "Failed to create user.";
      const status = /already registered|email.*exists|duplicate/i.test(msg) ? 409 : 500;
      return new Response(JSON.stringify({ message: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authUserId = created.user.id;

    const { data: adminRow, error: adminError } = await supabase
      .from("admins")
      .insert([
        {
          auth_user_id: authUserId,
          name,
          email,
          role,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (adminError || !adminRow?.admin_id) {
      await supabase.auth.admin.deleteUser(authUserId);
      return new Response(JSON.stringify({ message: adminError?.message || "Failed to create admin record." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const loginUrl = `${superadminBaseUrl.replace(/\/$/, "")}/login`;
    const supportUrl = `${superadminBaseUrl.replace(/\/$/, "")}/admin/change-password`;

    const emailPayload = {
      From: postmarkFrom,
      To: email,
      Subject: "Your Admin Access — Temporary Password",
      HtmlBody: `
        <div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5;">
          <p>Hi ${name},</p>
          <p>Your admin account has been created. Use the temporary password below to sign in:</p>
          <p style="font-size:16px;"><strong>${tempPassword}</strong></p>
          <p>Login here: <a href="${loginUrl}">${loginUrl}</a></p>
          <p>On first login, you will be required to change your password.</p>
          <p>If you face any issues, visit: <a href="${supportUrl}">${supportUrl}</a></p>
        </div>
      `,
      TextBody: `Hi ${name},\n\nYour admin account has been created.\nTemporary password: ${tempPassword}\nLogin: ${loginUrl}\nOn first login, you will be required to change your password.\n`,
      MessageStream: "staff",
    };

    const postmarkResponse = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkApiKey,
      },
      body: JSON.stringify(emailPayload),
    });

    const postmarkResult = await postmarkResponse.json().catch(() => ({}));
    const emailQueued = postmarkResponse.ok;
    const emailError = postmarkResponse.ok ? null : postmarkResult?.Message || "Failed to send email";

    return new Response(
      JSON.stringify({
        data: {
          id: adminRow.admin_id,
          authUserId,
          name,
          email,
          role: adminRow.role,
          active: adminRow.is_active,
          createdAt: adminRow.created_at,
        },
        tempPassword,
        emailQueued,
        emailError,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: (err as Error)?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
