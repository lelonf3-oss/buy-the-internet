import Stripe from 'stripe';

export async function onRequestGet() {
  return new Response("Stripe Datei ist geladen!", { status: 200 });
}

export async function onRequestPost({ request, env }) {
  // Die apiVersion-Zeile wurde entfernt, um den Fehler zu beheben.
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const url = new URL(request.url);

  // 1. WEBHOOK (wird aufgerufen, wenn jemand bezahlt hat)
  if (url.pathname.endsWith('/stripe-webhook')) {
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
      const auction = await env.DB.prepare("SELECT winner_paid FROM auctions WHERE id = ?").bind(auctionId).first();
      
      if (auction?.winner_paid !== 1) {
        const activeUntil = Math.floor(Date.now() / 1000) + 86400; // 24 Stunden
        await env.DB.prepare("UPDATE auctions SET status = 'paid', winner_paid = 1, ad_active_until = ? WHERE id = ?").bind(activeUntil, auctionId).run();
      }
    }
    return new Response('OK', { status: 200 });
  }

  // 2. CHECKOUT ERSTELLEN
  const { auctionId, amount, email } = await request.json();
  try {
    const session = await stripe.checkout.sessions.create({
      managed_payments: { enabled: false },
      allow_promotion_codes: true,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `BUY THE INTERNET – Auction #${auctionId}` },
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
    
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
