// Public-facing renderer for index.html.
// Fetches works + bullets from Supabase and populates the page.
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
		if (!bullets.length) return;
		for (const b of bullets) {
			const li = document.createElement('li');
			if (b.desktop_only) li.className = 'mobile-hidden';
			li.innerHTML = b.content;
			ul.appendChild(li);
		}
	}

	function renderNotes(bullets) {
		const tbody = document.getElementById('notesList');
		if (!tbody) return;
		tbody.innerHTML = '';
		if (!bullets.length) return;
		for (const b of bullets) {
			const tr = document.createElement('tr');
			if (b.desktop_only) tr.className = 'mobile-hidden';
			const td = document.createElement('td');
			td.className = 'web';
			td.innerHTML = '✽<br>' + b.content;
			tr.appendChild(td);
			tbody.appendChild(tr);
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
		for (const w of works) {
			const a = document.createElement('a');
			a.className = 'work-cell';
			if (w.external_url) {
				a.href = w.external_url;
				a.target = '_blank';
				a.rel = 'noopener';
			} else if (w.image_path) {
				a.href = imageUrl(w.image_path);
				a.target = '_blank';
				a.rel = 'noopener';
			}
			if (w.image_path) {
				const img = document.createElement('img');
				img.src = imageUrl(w.image_path);
				img.alt = w.title || '';
				img.loading = 'lazy';
				a.appendChild(img);
			}
			const meta = document.createElement('div');
			meta.className = 'work-meta';
			meta.textContent = [w.title, w.year].filter(Boolean).join(', ');
			a.appendChild(meta);
			root.appendChild(a);
		}
	}

	function renderWeb(works) {
		const table = document.getElementById('worksWeb');
		if (!table) return;
		const titleRow = table.querySelector('.works-web-titles');
		const numberRow = table.querySelector('.works-web-numbers');
		titleRow.innerHTML = '';
		numberRow.innerHTML = '';
		if (!works.length) return;
		const total = works.length;
		works.forEach((w, i) => {
			const td = document.createElement('td');
			td.className = 'web';
			const url = w.external_url || (w.image_path ? imageUrl(w.image_path) : '#');
			const label = `${w.title}${w.year ? ',' + w.year : ''}`;
			td.innerHTML = `<div class="verticalbox"><a href="${url}" class="verticaltext2">${label}</a></div>`;
			titleRow.appendChild(td);

			const numTd = document.createElement('td');
			const idx = total - i - 1;
			numTd.textContent = CIRCLED[idx] || '';
			numberRow.appendChild(numTd);
		});
	}

	async function load() {
		if (!window.sb) {
			// Supabase not configured — leave static fallback markup intact.
			return;
		}
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
		renderBio(bullets.filter(b => b.section === 'bio'));
		renderNotes(bullets.filter(b => b.section === 'notes'));
		renderPrint(works.filter(w => w.category === 'print'));
		renderWeb(works.filter(w => w.category === 'web'));
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', load);
	} else {
		load();
	}
})();
