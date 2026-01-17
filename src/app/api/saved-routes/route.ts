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

export async function GET(req: Request) {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const includeCurrent = url.searchParams.get("includeCurrent") === "true";

  let q = supabase
    .from("saved_routes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!includeCurrent) {
    q = q.neq("name", "current_route");
  }

  const { data, error } = await q;
  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ routes: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    stops?: any[];
    routeLine?: any[];
  } | null;

  const name = body?.name?.trim();
  const stops = body?.stops;
  const routeLine = body?.routeLine;

  if (!name || !Array.isArray(stops)) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const { data, error } = await supabase
    .from("saved_routes")
    .insert({
      user_id: userId,
      name,
      stops,
      route_line: Array.isArray(routeLine) ? routeLine : null,
    })
    .select("id,name")
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ ok: true, route: data ?? null });
}
