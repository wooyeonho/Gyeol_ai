/**
 * GYEOL (결) - Supabase Client (프론트용)
 * Singleton 패턴 - 한 번만 생성
 */

import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  // SSR 체크
  if (typeof window === 'undefined') {
    return null;
  }
  
  // 싱글톤 반환
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  supabaseInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
  
  return supabaseInstance;
}
