import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase 접속 정보.
// 우선순위: 환경변수(.env / Vercel) → 아래 기본값
// (anon 키는 브라우저에 공개되도록 설계된 공개키이며, 실제 보안은 RLS와
//  서버측 함수에서 보장됩니다. 그래서 기본값으로 두어도 안전합니다.)
const FALLBACK_URL = "https://xouwftwzewpnwatlckou.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvdXdmdHd6ZXdwbndhdGxja291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjkxMDcsImV4cCI6MjA5NjMwNTEwN30.BI0xVWk1dRXEHnRMpnuAhKJnsCBPY3Pr3uB8gnlPr1Y";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || FALLBACK_ANON_KEY;

// 두 값이 모두 있어야 정상 동작합니다.
export const isSupabaseConfigured = Boolean(url && anonKey);

// 설정이 없으면 null. (api 함수에서 친절한 안내 후 차단)
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;

// 설정 누락 시 공통으로 던지는 에러
export function requireClient(): SupabaseClient {
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}
