export async function onRequestGet({ env }) {
    const today = new Date().toISOString().slice(0, 10);

    // Deine bestehenden Abfragen
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

    // Hier addieren wir die 2000 Fake-Views auf die echten Views drauf
    const fakeStartValue = 2000;
    const realTotal = totalViews?.total || 0;

    return json({
        totalPageViews: realTotal + fakeStartValue, 
        todayPageViews: todayViews?.page_views || 0,
        currentAdActive: currentAd,
        winners: winners.results,
    });
}

// Diese Funktion zählt neue Besucher (wird per POST aufgerufen)
export async function onRequestPost({ env }) {
    const today = new Date().toISOString().slice(0, 10);
    try {
        const existing = await env.DB.prepare("SELECT * FROM stats WHERE date = ?").bind(today).first();
        
        if (existing) {
            // Wenn es für heute schon einen Eintrag gibt, zähle +1
            await env.DB.prepare("UPDATE stats SET page_views = page_views + 1 WHERE date = ?").bind(today).run();
        } else {
            // Wenn es der erste Besuch heute ist, erstelle den Eintrag
            await env.DB.prepare("INSERT INTO stats (date, page_views) VALUES (?, 1)").bind(today).run();
        }
        
        return json({ success: true });
    } catch (e) {
        return json({ error: e.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
