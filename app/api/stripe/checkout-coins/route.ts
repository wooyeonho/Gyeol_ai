/**
 * 코인 충전 Checkout (일회성 결제)
 * POST /api/stripe/checkout-coins
 * Body: { pack: '100' | '500' | '1000' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICE_COINS } from '@/lib/stripe';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const COIN_PACKS: Record<string, number> = { '100': 100, '500': 500, '1000': 1000 };

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Payment not configured' }, { status: 503 });
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pack } = await request.json();
    if (!pack || !['100', '500', '1000'].includes(pack)) {
      return NextResponse.json({ error: 'Invalid pack' }, { status: 400 });
    }

    const priceId = STRIPE_PRICE_COINS[pack];
    if (!priceId) {
      return NextResponse.json(
        { error: 'Coin pack not configured. Set STRIPE_PRICE_COINS_100, _500, _1000.' },
        { status: 500 }
      );
    }

    const coins = COIN_PACKS[pack];
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
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/settings?coins_success=true&pack=${pack}`,
      cancel_url: `${SITE_URL}/settings?canceled=true`,
      client_reference_id: user.id,
      metadata: { user_id: user.id, pack, coins: String(coins) },
      ...customerOptions,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Coin checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}
