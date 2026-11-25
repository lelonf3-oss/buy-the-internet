import Stripe from 'stripe';

export async function onRequestPost({ request, env }) {
  try {
    const { session_id, adData } = await request.json();

    if (!session_id) {
      return json({ error: "Missing payment session ID." }, 400);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-10-29' });

    // 1. Prüfe bei Stripe, ob diese Session wirklich bezahlt wurde!
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return json({ error: "Payment not completed." }, 403);
    }

    const auctionId = session.metadata.auctionId;

    // 2. Speichere die Werbedaten für GENAU diese Auktion
    const adDataString = JSON.stringify(adData);
    await env.DB.prepare(
      "UPDATE auctions SET ad_data = ? WHERE id = ? AND winner_paid = 1"
    ).bind(adDataString, auctionId).run();

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
