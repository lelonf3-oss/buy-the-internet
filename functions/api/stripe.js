import Stripe from 'stripe';

function getStripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);

  if (url.pathname.endsWith('/create-checkout')) {
    return createCheckout(request, env);
  }

  if (url.pathname.endsWith('/stripe-webhook')) {
    return handleWebhook(request, env);
  }

  return new Response('Not found', { status: 404 });
}

async function createCheckout(request, env) {
  const { auctionId, amount, email } = await request.json();
  const stripe = getStripe(env);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: `BUY THE INTERNET – 24h Takeover (Auction #${auctionId})`,
        },
        unit_amount: amount,
      },
      quantity: 1,
    }],
    mode: 'payment',
    customer_email: email,
    success_url: `${env.SITE_URL}/editor.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.SITE_URL}/?payment_cancelled=1`,
    metadata: { auctionId: String(auctionId) },
  });

  return json({ sessionId: session.id, url: session.url });
}

async function handleWebhook(request, env) {
  const stripe = getStripe(env);
  const sig = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const auctionId = session.metadata.auctionId;

    const auction = await env.DB.prepare(
      "SELECT winner_paid FROM auctions WHERE id = ?"
    ).bind(auctionId).first();

    if (auction?.winner_paid === 1) {
      return new Response('Already processed', { status: 200 });
    }

    const activeUntil = Math.floor(Date.now() / 1000) + 86400;
    await env.DB.prepare(
      "UPDATE auctions SET status = 'paid', winner_paid = 1, ad_active_until = ? WHERE id = ?"
    ).bind(activeUntil, auctionId).run();
  }

  return new Response('OK', { status: 200 });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}