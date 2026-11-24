export async function onRequestGet({ env }) {
  const now = Math.floor(Date.now() / 1000);

  // 1. Prüfen, ob eine aktive bezahlte Werbung existiert (Gewinner-Übernahme)
  const activeAd = await env.DB.prepare(
    "SELECT ad_data FROM auctions WHERE status = 'paid' AND ad_active_until > ? ORDER BY id DESC LIMIT 1"
  ).bind(now).first();

  // Wenn es eine aktive Werbung gibt, schicken wir nur diese Daten zurück
  if (activeAd && activeAd.ad_data) {
    return json({ activeAd: JSON.parse(activeAd.ad_data) });
  }

  // 2. Sonst: Normale Auktion laden
  const auction = await env.DB.prepare(
    "SELECT * FROM auctions WHERE status = 'active' ORDER BY id DESC LIMIT 1"
  ).first();

  if (!auction) {
    return json({ error: "No active auction" }, 404);
  }

  const bids = await env.DB.prepare(
    `SELECT b.amount, b.created_at, u.email
     FROM bids b JOIN users u ON b.user_id = u.id
     WHERE b.auction_id = ? ORDER BY b.amount DESC LIMIT 20`
  ).bind(auction.id).all();

  const highest = bids.results[0];
  const minNext = highest
    ? highest.amount + auction.min_increment
    : auction.min_bid;

  return json({
    auction: {
      id: auction.id,
      endTime: auction.end_time,
      minBid: auction.min_bid,
      minIncrement: auction.min_increment,
    },
    highestBid: highest || null,
    nextMinBid: minNext,
    recentBids: bids.results,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
