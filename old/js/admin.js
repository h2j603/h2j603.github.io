// Admin page logic: magic-link auth + CRUD for works/bullets.
(function () {
	const $  = (s, r = document) => r.querySelector(s);
	const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

	function formatError(err) {
		if (!err) return 'unknown';
		if (typeof err === 'string') return err;
		const parts = [];
		if (err.message) parts.push(err.message);
		if (err.code) parts.push(`(code: ${err.code})`);
		if (err.status) parts.push(`status: ${err.status}`);
		if (err.statusCode) parts.push(`status: ${err.statusCode}`);
		if (err.details) parts.push(`details: ${err.details}`);
		if (err.hint) parts.push(`hint: ${err.hint}`);
		if (!parts.length) {
			try { return JSON.stringify(err); } catch (_) { return String(err); }
		}
		return parts.join(' ');
	}

	function withTimeout(promise, ms, label) {
		return Promise.race([
			Promise.resolve(promise),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error(`${label} timeout (${ms / 1000}s 초과)`)), ms)
			)
		]);
	}

	const loginView  = $('#loginView');
	const dashView   = $('#dashView');
	const userBox    = $('#userBox');
	const userEmail  = $('#userEmail');
	const loginForm  = $('#loginForm');
	const loginMsg   = $('#loginMsg');
	const logoutBtn  = $('#logoutBtn');

	function ensureClient() {
		if (!window.sb) {
			document.body.innerHTML =
				'<main style="padding:2rem;font-family:Pretendard,system-ui,sans-serif;">' +
				'<h2>Supabase 설정이 필요합니다.</h2>' +
				'<p><code>js/config.js</code>에 Supabase URL과 anon key를 입력한 뒤 다시 열어주세요.</p>' +
				'</main>';
			return false;
		}
		return true;
	}

	function imageUrl(path) {
		if (!path) return '';
		if (/^https?:\/\//.test(path)) return path;
		const cfg = window.SUPABASE_CONFIG || {};
		return `${cfg.url.replace(/\/$/, '')}/storage/v1/object/public/works/${path}`;
	}

	async function setSessionView(session) {
		if (session) {
			loginView.hidden = true;
			dashView.hidden  = false;
			userBox.hidden   = false;
			userEmail.textContent = session.user.email || '';
			await reloadAll();
		} else {
			loginView.hidden = false;
			dashView.hidden  = true;
			userBox.hidden   = true;
		}
	}

	// ========== AUTH ==========
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		const email = $('#emailInput').value.trim();
		const password = $('#passwordInput').value;
		loginMsg.className = 'adm-msg';
		loginMsg.textContent = '로그인 중...';
		const { error } = await sb.auth.signInWithPassword({ email, password });
		if (error) {
			loginMsg.className = 'adm-msg error';
			loginMsg.textContent = '오류: ' + error.message;
		} else {
			loginMsg.className = 'adm-msg success';
			loginMsg.textContent = '로그인 성공';
		}
	});
	logoutBtn.addEventListener('click', async () => {
		await sb.auth.signOut();
	});

	// ========== TABS ==========
	$$('.adm-tabs button').forEach(btn => {
		btn.addEventListener('click', () => {
			$$('.adm-tabs button').forEach(b => b.classList.toggle('active', b === btn));
			$$('.adm-pane').forEach(p => {
				p.hidden = p.dataset.pane !== btn.dataset.tab;
			});
		});
	});

	// ========== WORKS CRUD ==========
	$$('.work-form').forEach(form => {
		const msg = form.querySelector('.adm-msg');
		const submitBtn = form.querySelector('button[type="submit"]');
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			submitBtn.disabled = true;
			msg.className = 'adm-msg';
			msg.textContent = '세션 확인 중...';
			try {
				const { data: sessionData } = await withTimeout(
					sb.auth.getSession(), 10000, '세션 조회'
				);
				if (!sessionData?.session) throw new Error('로그인 세션이 만료됨. 다시 로그인 해주세요.');

				const fd = new FormData(form);
				const file = fd.get('image');
				let image_path = null;
				if (file && file.size) {
					msg.textContent = `이미지 업로드 중 (${Math.round(file.size / 1024)}KB)...`;
					const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
					const key = `${form.dataset.category}/${crypto.randomUUID()}.${ext}`;
					const { error: upErr } = await withTimeout(
						sb.storage.from('works').upload(key, file, {
							cacheControl: '3600',
							upsert: false,
							contentType: file.type || 'application/octet-stream'
						}),
						60000,
						'스토리지 업로드'
					);
					if (upErr) {
						console.error('[storage upload]', upErr);
						throw upErr;
					}
					image_path = key;
				}
				msg.textContent = 'DB 저장 중...';
				const row = {
					category: form.dataset.category,
					title: fd.get('title')?.toString().trim(),
					year: fd.get('year')?.toString().trim() || null,
					external_url: fd.get('external_url')?.toString().trim() || null,
					description: fd.get('description')?.toString().trim() || null,
					sort_order: parseInt(fd.get('sort_order') || '0', 10) || 0,
					image_path
				};
				const { error } = await withTimeout(
					sb.from('works').insert(row), 15000, 'works insert'
				);
				if (error) {
					console.error('[works insert]', error);
					if (image_path) {
						await sb.storage.from('works').remove([image_path]).catch(() => {});
					}
					throw error;
				}
				msg.className = 'adm-msg success';
				msg.textContent = '추가됨';
				form.reset();
				await loadWorks();
			} catch (err) {
				console.error('[work-form submit]', err);
				msg.className = 'adm-msg error';
				msg.textContent = '오류: ' + formatError(err);
			} finally {
				submitBtn.disabled = false;
			}
		});
	});

	async function loadWorks() {
		const { data, error } = await sb.from('works').select('*').order('sort_order');
		if (error) { console.error(error); return; }
		renderWorksList('print', (data || []).filter(w => w.category === 'print'));
		renderWorksList('web',   (data || []).filter(w => w.category === 'web'));
	}

	function renderWorksList(category, items) {
		const ul = document.querySelector(`.adm-list[data-list="${category}"]`);
		ul.innerHTML = '';
		for (const w of items) {
			const li = document.createElement('li');
			const thumb = document.createElement('div'); thumb.className = 'thumb';
			if (w.image_path) {
				const img = document.createElement('img');
				img.src = imageUrl(w.image_path);
				thumb.appendChild(img);
			} else {
				thumb.textContent = '—';
			}
			const meta = document.createElement('div'); meta.className = 'meta';
			meta.innerHTML = `
				<strong>${escape(w.title)} ${w.year ? '· ' + escape(w.year) : ''}</strong>
				<small>${escape(w.external_url || '')}</small>
				<small>sort: ${w.sort_order}</small>
			`;
			const actions = document.createElement('div'); actions.className = 'actions';
			const editBtn = document.createElement('button'); editBtn.textContent = 'edit';
			editBtn.addEventListener('click', () => editWork(w));
			const delBtn = document.createElement('button'); delBtn.textContent = 'delete'; delBtn.className = 'del';
			delBtn.addEventListener('click', () => deleteWork(w));
			actions.append(editBtn, delBtn);
			li.append(thumb, meta, actions);
			ul.appendChild(li);
		}
	}

	async function editWork(w) {
		const title = prompt('제목', w.title); if (title === null) return;
		const year = prompt('연도', w.year || '');
		const url  = prompt('외부 링크', w.external_url || '');
		const desc = prompt('설명', w.description || '');
		const sort = prompt('정렬 순서', w.sort_order);
		const { error } = await sb.from('works').update({
			title: title.trim(),
			year: year?.trim() || null,
			external_url: url?.trim() || null,
			description: desc?.trim() || null,
			sort_order: parseInt(sort || '0', 10) || 0
		}).eq('id', w.id);
		if (error) { alert('오류: ' + error.message); return; }
		loadWorks();
	}

	async function deleteWork(w) {
		if (!confirm(`"${w.title}" 삭제?`)) return;
		if (w.image_path) {
			await sb.storage.from('works').remove([w.image_path]);
		}
		const { error } = await sb.from('works').delete().eq('id', w.id);
		if (error) { alert('오류: ' + error.message); return; }
		loadWorks();
	}

	// ========== BULLETS CRUD ==========
	$$('.bullet-form').forEach(form => {
		const msg = form.querySelector('.adm-msg');
		const submitBtn = form.querySelector('button[type="submit"]');
		form.addEventListener('submit', async (e) => {
			e.preventDefault();
			submitBtn.disabled = true;
			msg.className = 'adm-msg';
			msg.textContent = '세션 확인 중...';
			try {
				const { data: sessionData } = await withTimeout(
					sb.auth.getSession(), 10000, '세션 조회'
				);
				if (!sessionData?.session) throw new Error('로그인 세션이 만료됨. 다시 로그인 해주세요.');

				msg.textContent = 'DB 저장 중...';
				const fd = new FormData(form);
				const row = {
					section: form.dataset.section,
					content: fd.get('content')?.toString(),
					desktop_only: fd.get('desktop_only') === 'on',
					sort_order: parseInt(fd.get('sort_order') || '0', 10) || 0
				};
				const { error } = await withTimeout(
					sb.from('bullets').insert(row), 15000, 'bullets insert'
				);
				if (error) {
					console.error('[bullets insert]', error);
					throw error;
				}
				msg.className = 'adm-msg success';
				msg.textContent = '추가됨';
				form.reset();
				await loadBullets();
			} catch (err) {
				console.error('[bullet-form submit]', err);
				msg.className = 'adm-msg error';
				msg.textContent = '오류: ' + formatError(err);
			} finally {
				submitBtn.disabled = false;
			}
		});
	});

	async function loadBullets() {
		const { data, error } = await sb.from('bullets').select('*').order('sort_order');
		if (error) { console.error(error); return; }
		renderBulletsList('bio',   (data || []).filter(b => b.section === 'bio'));
		renderBulletsList('notes', (data || []).filter(b => b.section === 'notes'));
	}

	function renderBulletsList(section, items) {
		const ul = document.querySelector(`.adm-list[data-list="${section}"]`);
		ul.innerHTML = '';
		for (const b of items) {
			const li = document.createElement('li');
			const thumb = document.createElement('div'); thumb.className = 'thumb';
			thumb.textContent = b.desktop_only ? 'PC' : 'all';
			const meta = document.createElement('div'); meta.className = 'meta';
			meta.innerHTML = `
				<strong style="font-weight:400;">${escape(b.content)}</strong>
				<small>sort: ${b.sort_order} · ${b.desktop_only ? '데스크톱 only' : '모든 화면'}</small>
			`;
			const actions = document.createElement('div'); actions.className = 'actions';
			const editBtn = document.createElement('button'); editBtn.textContent = 'edit';
			editBtn.addEventListener('click', () => editBullet(b));
			const delBtn = document.createElement('button'); delBtn.textContent = 'delete'; delBtn.className = 'del';
			delBtn.addEventListener('click', () => deleteBullet(b));
			actions.append(editBtn, delBtn);
			li.append(thumb, meta, actions);
			ul.appendChild(li);
		}
	}

	async function editBullet(b) {
		const content = prompt('본문 (HTML)', b.content); if (content === null) return;
		const sort = prompt('정렬 순서', b.sort_order);
		const desktopOnly = confirm('데스크톱에서만 표시? (확인=Yes / 취소=No)');
		const { error } = await sb.from('bullets').update({
			content,
			sort_order: parseInt(sort || '0', 10) || 0,
			desktop_only: desktopOnly
		}).eq('id', b.id);
		if (error) { alert('오류: ' + error.message); return; }
		loadBullets();
	}

	async function deleteBullet(b) {
		if (!confirm('이 항목 삭제?')) return;
		const { error } = await sb.from('bullets').delete().eq('id', b.id);
		if (error) { alert('오류: ' + error.message); return; }
		loadBullets();
	}

	function escape(s) {
		return String(s ?? '').replace(/[&<>"']/g, c => ({
			'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
		}[c]));
	}

	async function reloadAll() {
		await Promise.all([loadWorks(), loadBullets()]);
	}

	// ========== INIT ==========
	if (!ensureClient()) return;
	sb.auth.getSession().then(({ data }) => setSessionView(data.session));
	sb.auth.onAuthStateChange((_event, session) => setSessionView(session));
})();
