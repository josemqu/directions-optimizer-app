import { NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  createSupabaseAuthedClient,
  getAccessTokenFromCookies,
} from "@/lib/supabaseServer";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function bytesToUuid(bytes: Uint8Array) {
  const hex = Buffer.from(bytes).toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

function stableUuidForAgendaPlace(userId: string, rawId: string) {
  if (isUuid(rawId)) return rawId;

  // Deterministic UUID (v5-like) derived from userId + rawId.
  // This keeps the same agenda place mapped to the same UUID across syncs.
  const input = `${userId}:${rawId}`;
  const hash = createHash("sha1").update(input).digest();
  const bytes = Uint8Array.from(hash.subarray(0, 16));

  // Set UUID version to 5 (0101)
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  // Set variant to RFC 4122 (10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

type AgendaPlaceInput = {
  id: string;
  name: string;
  label: string;
  position: { lat: number; lng: number };
  openingHours?: any;
};

async function getAuthed() {
  const token = await getAccessTokenFromCookies();
  if (!token)
    return {
      token: null as string | null,
      supabase: null as any,
      userId: null as string | null,
    };

  const supabase = createSupabaseAuthedClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user)
    return { token, supabase, userId: null as string | null };

  return { token, supabase, userId: data.user.id };
}

export async function GET() {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("agendas")
    .select("*")
    .eq("user_id", userId);

  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ places: data ?? [] });
}

export async function PUT(req: Request) {
  const { supabase, userId } = await getAuthed();
  if (!supabase || !userId)
    return new NextResponse("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    places?: AgendaPlaceInput[];
  } | null;

  const places = body?.places ?? [];
  if (!Array.isArray(places)) {
    return new NextResponse("Invalid body", { status: 400 });
  }

  const rows = places.map((p) => ({
    id: stableUuidForAgendaPlace(userId, p.id),
    user_id: userId,
    name: p.name,
    label: p.label,
    position: p.position,
    opening_hours: p.openingHours,
  }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("agendas").upsert(rows);
  if (error) return new NextResponse(error.message, { status: 500 });

  return NextResponse.json({ ok: true });
}
