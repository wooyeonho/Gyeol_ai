/**
 * Stripe Checkout Session 생성
 * POST /api/stripe/checkout
 * Body: { tier: 'pro' | 'premium' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICE_PRO, STRIPE_PRICE_PREMIUM } from '@/lib/stripe';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Payment not configured' },
      { status: 503 }
    );
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier } = await request.json();
    if (!tier || !['pro', 'premium'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    const priceId = tier === 'pro' ? STRIPE_PRICE_PRO : STRIPE_PRICE_PREMIUM;
    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe price not configured. Set STRIPE_PRICE_PRO and STRIPE_PRICE_PREMIUM.' },
        { status: 500 }
      );
    }

    // 기존 Stripe customer 조회
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    const customerOptions: { customer?: string; customer_email?: string } = {};
    if (profile?.stripe_customer_id) {
      customerOptions.customer = profile.stripe_customer_id;
    } else {
      customerOptions.customer_email = user.email || undefined;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/settings?success=true`,
      cancel_url: `${SITE_URL}/settings?canceled=true`,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { user_id: user.id },
        trial_period_days: 0,
      },
      metadata: { user_id: user.id, tier },
      ...customerOptions,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
