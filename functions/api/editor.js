import Stripe from 'stripe';

export async function onRequestPost({ request, env }) {
  try {
    const { session_id, adData } = await request.json();

    if (!session_id) {
      return json({ error: "Missing payment session ID." }, 400);
    }

    // Die apiVersion-Zeile wurde entfernt.
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    
    // Prüfen, ob die Zahlung wirklich erfolgreich war
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return json({ error: "Payment not completed." }, 403);
    }

    const auctionId = session.metadata.auctionId;
    const adDataString = JSON.stringify(adData);

    // Werbedaten speichern (nur wenn auch bezahlt wurde)
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
