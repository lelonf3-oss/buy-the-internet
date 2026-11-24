export async function onRequest(context) {
  const { request, env, next } = context;
  const response = await next();

  // Seitenaufrufe nur für HTML-Requests zählen
  if (response.headers.get('content-type')?.includes('text/html')) {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await env.DB.prepare(`
        INSERT INTO stats (date, page_views) VALUES (?, 1)
        ON CONFLICT(date) DO UPDATE SET page_views = page_views + 1
      `).bind(today).run();
    } catch (e) {
      console.error('Stats error:', e);
    }
  }

  return response;
}