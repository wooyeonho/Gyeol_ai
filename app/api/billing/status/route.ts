/**
 * 결제 상태 조회 (payment_alert 포함)
 * GET /api/billing/status
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data } = await supabase
      .from('profiles')
      .select('tier, stripe_subscription_status, payment_alert')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      tier: data?.tier || 'free',
      subscription_status: data?.stripe_subscription_status,
      payment_alert: data?.payment_alert,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
