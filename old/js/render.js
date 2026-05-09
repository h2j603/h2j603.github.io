// Public-facing renderer. Fetches works + bullets from Supabase and replaces
// the static fallback markup. If Supabase isn't configured or the fetch fails,
// the static fallback in index.html stays.
(function () {
	const CIRCLED = ['㊀','㊁','㊂','㊃','㊄','㊅','㊆','㊇','㊈','㊉'];

	function imageUrl(path) {
		if (!path) return '';
		if (/^https?:\/\//.test(path)) return path;
		const cfg = window.SUPABASE_CONFIG || {};
		return cfg.url
			? `${cfg.url.replace(/\/$/, '')}/storage/v1/object/public/works/${path}`
			: '';
	}

	function renderBio(bullets) {
		const ul = document.getElementById('bioList');
		if (!ul) return;
		ul.innerHTML = '';
		for (const b of bullets) {
			const li = document.createElement('li');
			if (b.desktop_only) li.className = 'mobile-hidden';
			li.innerHTML = b.content;
			ul.appendChild(li);
		}
	}

	function renderNotes(bullets) {
		const ol = document.getElementById('notesList');
		if (!ol) return;
		ol.innerHTML = '';
		for (const b of bullets) {
			const li = document.createElement('li');
			if (b.desktop_only) li.className = 'mobile-hidden';
			li.innerHTML = `<span class="dot">✽</span>${b.content}`;
			ol.appendChild(li);
		}
	}

	function renderPrint(works) {
		const root = document.getElementById('worksPrint');
		if (!root) return;
		root.innerHTML = '';
		if (!works.length) {
			const empty = document.createElement('div');
			empty.className = 'works-empty';
			empty.textContent = root.dataset.empty || '';
			root.appendChild(empty);
			return;
		}
		const ol = document.createElement('ol');
		ol.className = 'print-list';
		for (const w of works) {
			const li = document.createElement('li');
			const a = document.createElement('a');
			const href = w.external_url || (w.image_path ? imageUrl(w.image_path) : '');
			if (href) {
				a.href = href;
				a.target = '_blank';
				a.rel = 'noopener';
			}
			a.textContent = `${w.title}${w.year ? ', ' + w.year : ''}`;
			li.appendChild(a);
			ol.appendChild(li);
		}
		root.appendChild(ol);
	}

	function renderWeb(works) {
		const ol = document.getElementById('worksWeb');
		if (!ol) return;
		ol.innerHTML = '';
		const total = works.length;
		// Row 1: 8 titles
		for (const w of works) {
			const li = document.createElement('li');
			li.className = 'title';
			const a = document.createElement('a');
			a.href = w.external_url || (w.image_path ? imageUrl(w.image_path) : '#');
			a.textContent = `${w.title}${w.year ? ',' + w.year : ''}`;
			li.appendChild(a);
			ol.appendChild(li);
		}
		// Row 2: matching numerals (countdown from total to 1, right→left)
		works.forEach((_, i) => {
			const li = document.createElement('li');
			li.className = 'num';
			const idx = total - i - 1;
			li.textContent = CIRCLED[idx] || '';
			ol.appendChild(li);
		});
	}

	async function load() {
		if (!window.sb) return;
		const [bulletsRes, worksRes] = await Promise.all([
			sb.from('bullets').select('*').order('sort_order', { ascending: true }),
			sb.from('works').select('*').order('sort_order', { ascending: true })
		]);
		if (bulletsRes.error || worksRes.error) {
			console.error('[supabase fetch]', bulletsRes.error || worksRes.error);
			return;
		}
		const bullets = bulletsRes.data || [];
		const works   = worksRes.data   || [];
		const bio    = bullets.filter(b => b.section === 'bio');
		const notes  = bullets.filter(b => b.section === 'notes');
		const print  = works.filter(w => w.category === 'print');
		const web    = works.filter(w => w.category === 'web');
		if (bio.length)   renderBio(bio);
		if (notes.length) renderNotes(notes);
		// Always render print (so empty state shows correctly)
		renderPrint(print);
		if (web.length)   renderWeb(web);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', load);
	} else {
		load();
	}
})();
