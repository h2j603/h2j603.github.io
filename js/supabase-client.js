(function () {
	const cfg = window.SUPABASE_CONFIG || {};
	if (!cfg.url || !cfg.anonKey) {
		console.warn('[supabase] config missing — populate js/config.js. Site will run in static fallback mode.');
		window.sb = null;
		return;
	}
	if (!window.supabase || !window.supabase.createClient) {
		console.error('[supabase] supabase-js not loaded.');
		window.sb = null;
		return;
	}
	window.sb = window.supabase.createClient(cfg.url, cfg.anonKey, {
		auth: { persistSession: true, autoRefreshToken: true }
	});
})();
