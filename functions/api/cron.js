export async function onRequestGet({ env }) {
  const now = Math.floor(Date.now() / 1000);
  let log = [];

  // 1. Prüfen, ob eine bezahlte Werbung abgelaufen ist
  const expiredAds = await env.DB.prepare(
    "SELECT * FROM auctions WHERE status = 'paid' AND ad_active_until <= ?"
  ).bind(now).all();

  for (const ad of expiredAds.results) {
    await env.DB.prepare("UPDATE auctions SET status = 'completed' WHERE id = ?").bind(ad.id).run();
    log.push(`Ad for auction #${ad.id} expired.`);
    
    // Neue Auktion starten (12 Stunden = 43200 Sekunden)
    await env.DB.prepare(
      "INSERT INTO auctions (status, start_time, end_time, min_bid, min_increment) VALUES ('active', ?, ?, 100, 100)"
    ).bind(now, now + 43200).run();
    log.push("Started new 12h auction.");
  }

  // 2. Prüfen, ob eine laufende Auktion abgelaufen ist (ohne Bezahlung)
  const expiredAuction = await env.DB.prepare(
    "SELECT * FROM auctions WHERE status = 'active' AND end_time <= ?"
  ).bind(now).first();

  if (expiredAuction) {
    // Höchstes Gebot finden
    const highestBid = await env.DB.prepare(
      "SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1"
    ).bind(expiredAuction.id).first();

    if (highestBid) {
      // Status auf 'ended' setzen (wartet auf Zahlung)
      await env.DB.prepare("UPDATE auctions SET status = 'ended', winner_id = ? WHERE id = ?")
        .bind(highestBid.user_id, expiredAuction.id).run();
      log.push(`Auction #${expiredAuction.id} ended. Winner ID: ${highestBid.user_id}`);
    } else {
      // Keine Gebote -> einfach neue Auktion starten (12 Stunden)
      await env.DB.prepare("UPDATE auctions SET status = 'completed' WHERE id = ?").bind(expiredAuction.id).run();
      await env.DB.prepare(
        "INSERT INTO auctions (status, start_time, end_time, min_bid, min_increment) VALUES ('active', ?, ?, 100, 100)"
      ).bind(now, now + 43200).run();
      log.push("No bids. Started new 12h auction.");
    }
  }

  return new Response(JSON.stringify({ success: true, log }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
