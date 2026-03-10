/**
 * Stripe Webhook - subscription lifecycle 동기화
 * Raw body 필요 (시그니처 검증)
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not set');
  return new Stripe(key, { typescript: true });
}

// Next.js가 body를 파싱하지 않도록
export const runtime = 'nodejs';

function tierFromPriceId(priceId: string): 'pro' | 'premium' | null {
  const proPrice = process.env.STRIPE_PRICE_PRO;
  const premiumPrice = process.env.STRIPE_PRICE_PREMIUM;
  if (priceId === proPrice) return 'pro';
  if (priceId === premiumPrice) return 'premium';
  return null;
}

async function updateTier(sb: SupabaseClient, userId: string, tier: 'free' | 'pro' | 'premium') {
  await (sb as any).from('profiles').update({
    tier,
    stripe_subscription_status: tier === 'free' ? null : 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
}

async function handleCheckoutCompleted(sb: SupabaseClient, session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  if (!userId) return;

  if (session.mode === 'payment') {
    const coins = parseInt(session.metadata?.coins || '0', 10);
    if (coins > 0) {
      const { data: profile } = await sb.from('profiles').select('coins').eq('id', userId).single();
      const newCoins = (profile?.coins || 0) + coins;
      await (sb as any).from('profiles').update({
        coins: newCoins,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
      await sb.from('coin_transactions').insert({
        user_id: userId,
        amount: coins,
        reason: '코인 충전',
        type: 'reward',
      });
    }
    const customerId = session.customer as string;
    if (customerId) {
      await (sb as any).from('profiles').update({
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
    return;
  }

  const tier = (session.metadata?.tier as 'pro' | 'premium') || 'pro';
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  await (sb as any).from('profiles').update({
    tier,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    stripe_subscription_status: 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
}

async function handleSubscriptionUpdated(sb: SupabaseClient, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.user_id;
  if (!userId) return;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = tierFromPriceId(priceId);
  if (status === 'active' || status === 'trialing') {
    if (tier) {
      await (sb as any).from('profiles').update({
        tier,
        stripe_subscription_status: status,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    }
  } else if (status === 'canceled' || status === 'unpaid' || status === 'past_due') {
    await updateTier(sb, userId, 'free');
    await (sb as any).from('profiles').update({
      stripe_subscription_id: null,
      stripe_subscription_status: status,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
  }
}

async function handleSubscriptionDeleted(sb: SupabaseClient, subscription: Stripe.Subscription) {
  let userId = subscription.metadata?.user_id;
  if (!userId) {
    const { data } = await sb.from('profiles').select('id').eq('stripe_subscription_id', subscription.id).single();
    userId = data?.id;
  }
  if (!userId) return;
  await updateTier(sb, userId, 'free');
  await (sb as any).from('profiles').update({
    stripe_subscription_id: null,
    stripe_subscription_status: null,
    payment_alert: null,
    updated_at: new Date().toISOString(),
  }).eq('id', userId);
}

async function handleInvoicePaymentFailed(sb: SupabaseClient, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const { data: profile } = await sb.from('profiles').select('id').eq('stripe_customer_id', customerId).single();
  if (!profile) return;
  await (sb as any).from('profiles').update({
    payment_alert: {
      type: 'payment_failed',
      message: '결제에 실패했습니다. 결제 수단을 확인해주세요.',
      invoice_id: invoice.id,
      created_at: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }).eq('id', profile.id);
}

async function handleInvoicePaid(sb: SupabaseClient, invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  await (sb as any).from('profiles').update({
    payment_alert: null,
    updated_at: new Date().toISOString(),
  }).eq('stripe_customer_id', customerId);
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let event: Stripe.Event;
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency: 중복 이벤트 방지
  const { data: existing } = await supabase
    .from('stripe_webhook_events')
    .select('id')
    .eq('id', event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true });
  }

  await supabase.from('stripe_webhook_events').insert({ id: event.id });

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(supabase, event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(supabase, event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(supabase, event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(supabase, event.data.object as Stripe.Invoice);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(supabase, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
