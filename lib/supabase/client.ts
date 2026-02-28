/**
 * GYEOL (결) - Supabase Client (프론트용)
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  // SSR 체크 - 브라우저에서만 생성
  if (typeof window === 'undefined') {
    return null;
  }
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}
