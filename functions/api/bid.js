export async function onRequestPost({ request, env }) {
  const { auctionId, amount, email } = await request.json();

  if (!auctionId || !amount || amount < 100) {
    return json({ error: "Invalid amount" }, 400);
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Valid email required" }, 400);
  }

  const auction = await env.DB.prepare(
    "SELECT * FROM auctions WHERE id = ? AND status = 'active'"
  ).bind(auctionId).first();

  if (!auction) return json({ error: "Auction not found or inactive" }, 404);

  const now = Math.floor(Date.now() / 1000);
  if (now > auction.end_time) {
    return json({ error: "Auction has ended" }, 400);
  }

  const highest = await env.DB.prepare(
    "SELECT amount FROM bids WHERE auction_id = ? ORDER BY amount DESC LIMIT 1"
  ).bind(auctionId).first();

  const minRequired = highest
    ? highest.amount + auction.min_increment
    : auction.min_bid;

  if (amount < minRequired) {
    return json({ error: `Minimum bid is ${minRequired}` }, 400);
  }

  let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email).first();

  if (!user) {
    user = await env.DB.prepare(
      "INSERT INTO users (email) VALUES (?) RETURNING *"
    ).bind(email).first();
  }

  await env.DB.prepare(
    "INSERT INTO bids (auction_id, user_id, amount) VALUES (?, ?, ?)"
  ).bind(auctionId, user.id, amount).run();

  // Last-Minute-Verlängerung: 2 Minuten
  let newEndTime = auction.end_time;
  if (auction.end_time - now < 120) {
    newEndTime = now + 120;
    await env.DB.prepare(
      "UPDATE auctions SET end_time = ? WHERE id = ?"
    ).bind(newEndTime, auctionId).run();
  }

  return json({ success: true, newEndTime });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}