import { NextResponse } from "next/server";
import {
  createSupabaseAuthedClient,
  getAccessTokenFromCookies,
} from "@/lib/supabaseServer";

async function getAuthed() {
  const token = await getAccessTokenFromCookies();
  if (!token) return { supabase: null as any, userId: null as string | null };

  const supabase = createSupabaseAuthedClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, userId: null as string | null };

  return { supabase, userId: data.user.id };
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  const { error } = await supabase
    .from("saved_routes")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await ctx.params;

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    stops?: any[];
    routeLine?: any[];
  } | null;

  const name = body?.name?.trim();
  const stops = body?.stops;
  const routeLine = body?.routeLine;

  if (!Array.isArray(stops)) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const update: Record<string, unknown> = {
    stops,
    route_line: Array.isArray(routeLine) ? routeLine : null,
  };
  if (name) update.name = name;

  const { data, error } = await supabase
    .from("saved_routes")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id,name")
    .maybeSingle();

  if (error) return new NextResponse(error.message, { status: 500 });
  if (!data) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json({ ok: true, route: data });
}
