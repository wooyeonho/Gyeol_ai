import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  let supabaseResponse = intlResponse || NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in middleware');
    return intlResponse || supabaseResponse;
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    )

    // IMPORTANT: DO NOT REMOVE THIS LINE
    // supabase.auth.getUser()를 호출해야 쿠키 갱신 로직이 실행됨
    const { data: { user } } = await supabase.auth.getUser()

    // 리다이렉트 로직 활성화
    const publicRoutes = ['/login', '/landing', '/api', '/card'];
    const isPublicRoute = publicRoutes.some(r => request.nextUrl.pathname.startsWith(r));

    if (!user && !isPublicRoute) {
      if (request.nextUrl.pathname !== '/') {
        const redirect = NextResponse.redirect(new URL('/login', request.url));
        supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
        return redirect;
      }
    }

    if (user && request.nextUrl.pathname === '/login') {
      const redirect = NextResponse.redirect(new URL('/', request.url));
      supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
      return redirect;
    }

    return supabaseResponse;
  } catch (e) {
    console.error('Middleware error:', e)
    // 에러 발생 시 크래시 내지 말고 그냥 통과시킬 것 (Next.js 15 제약 우회)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
