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
    await env.DB.prepare(
      "INSERT INTO auctions (status, start_time, end_time, min_bid, min_increment) VALUES ('active', ?, ?, 100, 100)"
    ).bind(now, now + 43200).run();
    log.push("Started new 12h auction.");
  }

  // 2. Prüfen, ob eine laufende Auktion abgelaufen ist
  const expiredAuction = await env.DB.prepare(
    "SELECT * FROM auctions WHERE status = 'active' AND end_time <= ?"
  ).bind(now).first();

  if (expiredAuction) {
    const highestBid = await env.DB.prepare(
      "SELECT * FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1"
    ).bind(expiredAuction.id).first();

    if (highestBid) {
      await env.DB.prepare("UPDATE auctions SET status = 'ended', winner_id = ?, ended_at = ? WHERE id = ?")
        .bind(highestBid.user_id, now, expiredAuction.id).run();
      log.push(`Auction #${expiredAuction.id} ended. Waiting for payment.`);
    } else {
      await env.DB.prepare("UPDATE auctions SET status = 'completed' WHERE id = ?").bind(expiredAuction.id).run();
      await env.DB.prepare(
        "INSERT INTO auctions (status, start_time, end_time, min_bid, min_increment) VALUES ('active', ?, ?, 100, 100)"
      ).bind(now, now + 43200).run();
      log.push("No bids. Started new 12h auction.");
    }
  }

  // 3. Fake-Bieter (Deadbeats) bestrafen (1 Stunde Karenzzeit)
  const deadbeatAuction = await env.DB.prepare(
    "SELECT * FROM auctions WHERE status = 'ended' AND ended_at <= ?"
  ).bind(now - 3600).first();

  if (deadbeatAuction) {
    const nextHighestBid = await env.DB.prepare(
      "SELECT * FROM bids WHERE auction_id = ? AND user_id != ? ORDER BY amount DESC LIMIT 1"
    ).bind(deadbeatAuction.id, deadbeatAuction.winner_id).first();

    if (nextHighestBid) {
      await env.DB.prepare("UPDATE auctions SET winner_id = ?, ended_at = ? WHERE id = ?")
        .bind(nextHighestBid.user_id, now, deadbeatAuction.id).run();
      log.push(`Deadbeat bidder. Auction #${deadbeatAuction.id} passed to next bidder.`);
    } else {
      await env.DB.prepare("UPDATE auctions SET status = 'completed' WHERE id = ?").bind(deadbeatAuction.id).run();
      await env.DB.prepare(
        "INSERT INTO auctions (status, start_time, end_time, min_bid, min_increment) VALUES ('active', ?, ?, 100, 100)"
      ).bind(now, now + 43200).run();
      log.push("No other bidders. Auction failed. Started new 12h auction.");
    }
  }

  return new Response(JSON.stringify({ success: true, log }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
