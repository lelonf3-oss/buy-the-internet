export async function onRequestPost({ request, env }) {
  try {
    const { token, adData } = await request.json();

    // Finde die aktuellste bezahlte Auktion (für den MVP)
    const auction = await env.DB.prepare(
      "SELECT id FROM auctions WHERE status = 'paid' ORDER BY id DESC LIMIT 1"
    ).first();

    if (!auction) {
      return new Response(JSON.stringify({ error: "No paid auction found to save to." }), { 
        status: 400, headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Werbedaten als Text (JSON) speichern
    const adDataString = JSON.stringify(adData);
    await env.DB.prepare(
      "UPDATE auctions SET ad_data = ? WHERE id = ?"
    ).bind(adDataString, auction.id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, headers: { 'Content-Type': 'application/json' } 
    });
  }
}
