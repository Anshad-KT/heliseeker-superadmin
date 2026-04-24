import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../_lib/supabase';

const MAX_METADATA_STRING_LENGTH = 512;

function stripOversizedUserMetadata(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return { changed: false, sanitized: null as Record<string, unknown> | null };
  }

  let changed = false;
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (typeof value === 'string') {
      const isDataUrl = value.startsWith('data:');
      const isOversized = value.length > MAX_METADATA_STRING_LENGTH;

      if (isDataUrl || isOversized) {
        changed = true;
        continue;
      }
    }

    sanitized[key] = value;
  }

  return { changed, sanitized };
}

async function sanitizeCurrentUserMetadata(supabase: Awaited<ReturnType<typeof getServerSupabase>>, metadata: Record<string, unknown> | null | undefined) {
  const { changed, sanitized } = stripOversizedUserMetadata(metadata);

  if (!changed) {
    return;
  }

  const { error } = await supabase.auth.updateUser({
    data: sanitized ?? {},
  });

  if (!error) {
    await supabase.auth.refreshSession();
  }
}

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    await sanitizeCurrentUserMetadata(
      supabase,
      (userData.user.user_metadata as Record<string, unknown> | undefined) ?? null,
    );
    const authUserId = userData.user.id;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('admin_id, auth_user_id, name, email, role, img, is_active, last_login_at, created_at, updated_at')
      .eq('auth_user_id', authUserId)
      .single();
    if (error || !admin) return NextResponse.json({ message: 'Admin profile not found' }, { status: 404 });
    return NextResponse.json({ message: 'Success', data: admin });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const updates = await req.json();
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
    await sanitizeCurrentUserMetadata(
      supabase,
      (userData.user.user_metadata as Record<string, unknown> | undefined) ?? null,
    );
    const authUserId = userData.user.id;

    const safeUpdates: { name?: string; email?: string; img?: string } = {}
    if (typeof updates?.name === 'string') safeUpdates.name = updates.name
    if (typeof updates?.email === 'string') safeUpdates.email = updates.email
    if (typeof updates?.img === 'string') {
      if (updates.img.startsWith('data:')) {
        return NextResponse.json({ message: 'Profile image must be stored as a file URL or path' }, { status: 400 });
      }
      safeUpdates.img = updates.img
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .update(safeUpdates)
      .eq('auth_user_id', authUserId)
      .select('admin_id, auth_user_id, name, email, role, img, is_active, last_login_at, created_at, updated_at')
      .single();
    if (error || !admin) return NextResponse.json({ message: 'Failed to update profile' }, { status: 400 });
    return NextResponse.json({ message: 'Updated', data: admin });
  } catch (e: any) {
    return NextResponse.json({ message: e?.message || 'Failed' }, { status: 500 });
  }
}
