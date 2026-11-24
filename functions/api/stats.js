export async function onRequestGet({ env }) {
  const today = new Date().toISOString().slice(0, 10);

  const totalViews = await env.DB.prepare(
    "SELECT SUM(page_views) as total FROM stats"
  ).first();

  const todayViews = await env.DB.prepare(
    "SELECT page_views FROM stats WHERE date = ?"
  ).bind(today).first();

  const currentAd = await env.DB.prepare(
    "SELECT ad_data, ad_active_until FROM auctions WHERE status = 'paid' AND ad_active_until > ? ORDER BY id DESC LIMIT 1"
  ).bind(Math.floor(Date.now() / 1000)).first();

  const winners = await env.DB.prepare(
    "SELECT winner_email, winning_bid, ended_at FROM hall_of_fame ORDER BY ended_at DESC LIMIT 10"
  ).all();

  return json({
    totalPageViews: totalViews?.total || 0,
    todayPageViews: todayViews?.page_views || 0,
    currentAdActive: !!currentAd,
    winners: winners.results,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}