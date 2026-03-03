import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables in middleware')
    return supabaseResponse
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
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // IMPORTANT: DO NOT REMOVE THIS LINE
    // supabase.auth.getUser()를 호출해야 쿠키 갱신 로직이 실행됨
    const { data: { user } } = await supabase.auth.getUser()

    const publicPaths = ['/login', '/landing', '/'];
    const isPublic = publicPaths.includes(request.nextUrl.pathname)
      || request.nextUrl.pathname.startsWith('/api')
      || request.nextUrl.pathname.startsWith('/_next');
    if (!user && !isPublic) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (user && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return supabaseResponse
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
