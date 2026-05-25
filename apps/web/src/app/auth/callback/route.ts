import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const returnUrl = searchParams.get('returnUrl') ?? '/';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    try {
      // Exchange code for session
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

      if (sessionError) {
        throw sessionError;
      }

      // Ensure profile exists (for OAuth users)
      if (data.session) {
        try {
          await fetch(`${apiUrl}/auth/ensure-profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({}), // Empty body to satisfy Fastify
          });
        } catch (profileError) {
          console.error('Error ensuring profile:', profileError);
          // Continue anyway - profile might already exist
        }
      }
    } catch (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(`${appUrl}/login?error=auth_callback_error`);
    }
  }

  return NextResponse.redirect(`${appUrl}${returnUrl}`);
}
