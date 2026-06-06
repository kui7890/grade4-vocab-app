import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 환경변수에서 Supabase 접속 정보를 읽습니다.
// (.env 파일 또는 Vercel 환경변수에 설정)
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// 두 값이 모두 있어야 정상 동작합니다.
export const isSupabaseConfigured = Boolean(url && anonKey);

// 설정이 없으면 null. (api 함수에서 친절한 안내 후 차단)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;

// 설정 누락 시 공통으로 던지는 에러
export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}
