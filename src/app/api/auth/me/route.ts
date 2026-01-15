import { NextResponse } from "next/server";
import {
  createSupabaseAuthedClient,
  getAccessTokenFromCookies,
} from "@/lib/supabaseServer";

export async function GET() {
  const token = await getAccessTokenFromCookies();
  if (!token) return NextResponse.json({ user: null });

  const supabase = createSupabaseAuthedClient(token);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: data.user ?? null });
}
