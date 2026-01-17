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

export async function GET() {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("saved_routes")
    .select("*")
    .eq("user_id", userId)
    .eq("name", "current_route")
    .maybeSingle();

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ route: data ?? null });
}

export async function PUT(req: Request) {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { stops?: any[] } | null;

  const stops = body?.stops;
  if (!Array.isArray(stops)) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const { data: existing, error: findError } = await supabase
    .from("saved_routes")
    .select("id")
    .eq("user_id", userId)
    .eq("name", "current_route")
    .maybeSingle();

  if (findError) return new NextResponse(findError.message, { status: 500 });

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("saved_routes")
      .update({ stops, route_line: null })
      .eq("id", existing.id)
      .eq("user_id", userId);

    if (updateError)
      return new NextResponse(updateError.message, { status: 500 });
  } else {
    const { error: insertError } = await supabase.from("saved_routes").insert({
      user_id: userId,
      name: "current_route",
      stops,
      route_line: null,
    });

    if (insertError)
      return new NextResponse(insertError.message, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
