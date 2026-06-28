// 방명록 — 구글 시트(Apps Script 웹앱)가 저장소.
//   읽기: JSONP (?callback=) — 크로스오리진 GET CORS 우회
//   쓰기: no-cors POST (text/plain) — 프리플라이트 회피. 응답은 못 읽으니 성공 가정.
// 연출: 입력창은 화면 중앙에 콤팩트하게 고정, 남겨진 메시지들은
//   커튼 위를 하나씩 떠오른다(rise 애니메이션). 커튼 첫 열림에 1회 로드.

var GB_URL = 'https://script.google.com/macros/s/AKfycbx5fDxmlQ09beEerLeqkVqUOZ2w-PNXTEsZkXrA8ZhxNa369P2wpZVX81_zwYySGxnIgw/exec';

var I18N = {
  ko: { title: '방명록', name: '이름 (선택)', message: '한마디 남기기…', submit: '남기기',
        sending: '남기는 중…', done: '남겼어요!', fail: '실패 — 잠시 후 다시', anon: '익명' },
  en: { title: 'Guestbook', name: 'Name (optional)', message: 'Leave a note…', submit: 'Leave',
        sending: 'Sending…', done: 'Signed!', fail: 'Failed — try again', anon: 'Anonymous' },
};
function curLang() { return document.documentElement.lang === 'en' ? 'en' : 'ko'; }
var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function esc(s) {
  var d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}
// KST 초단위까지 — 사이트의 다른 시각 표기(memo·푸터)와 동일 포맷.
function fmt(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  if (isNaN(d.getTime())) {
    var s = String(ts);
    return s.length >= 10 ? s.slice(0, 10).replace(/-/g, '.') : s;
  }
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(d);
  var g = function (t) { var p = parts.find(function (x) { return x.type === t; }); return p ? p.value : ''; };
  return g('year') + '.' + g('month') + '.' + g('day') + ' ' + g('hour') + ':' + g('minute') + ':' + g('second');
}
function rnd(a, b) { return a + Math.random() * (b - a); }

export function initGuestbook() {
  var drawer = document.querySelector('.about-drawer');
  var layer = document.querySelector('.gb-float-layer');
  var form = document.querySelector('.gb-form');
  if (!drawer || !layer || !form) return;
  var nameI = form.querySelector('.gb-name');
  var msgI = form.querySelector('.gb-message');
  var status = form.querySelector('.gb-status');
  var submit = form.querySelector('.gb-submit');
  var loaded = false;
  var sending = false;

  function t() { return I18N[curLang()]; }

  // 메시지 한 개 → 떠오르는 노트. fresh=true면 방금 남긴 글(바닥에서 새로 시작).
  function spawn(it, fresh) {
    var name = (it.name || '').trim() || t().anon;
    var el = document.createElement('div');
    el.className = 'gb-float';
    el.innerHTML = '<div class="gb-item-head"><span class="gb-item-name">' + esc(name) + '</span>'
      + (it.ts ? '<span>' + esc(fmt(it.ts)) + '</span>' : '') + '</div>'
      + '<div class="gb-item-msg">' + esc(it.message) + '</div>';
    // 좁은 화면은 노트가 넓어(64vw) 오른쪽으로 삐져나가 잘리므로 left 범위를 좁힌다
    var maxLeft = window.innerWidth < 600 ? 34 : 78;
    el.style.left = rnd(3, maxLeft).toFixed(1) + '%';
    if (REDUCE) {
      // 모션 최소화 — 애니메이션 없이 화면 안 임의 높이에 정적 배치
      el.style.top = rnd(8, 82) + 'vh';
    } else {
      var dur = rnd(22, 42);
      el.style.animationDuration = dur.toFixed(1) + 's';
      // 기존 글은 음수 딜레이로 사이클 곳곳에 흩뿌려 즉시 '여럿이 떠다니는' 그림.
      el.style.animationDelay = (fresh ? 0 : -rnd(0, dur)).toFixed(1) + 's';
      el.style.setProperty('--sway', rnd(-7, 7).toFixed(1) + 'vw');
    }
    layer.appendChild(el);
    // 모서리는 노트 크기에 비례 — 작은 쪽지는 살짝, 큰 쪽지는 더 둥글게 (고정값 X)
    var r = Math.round(Math.min(el.offsetWidth, el.offsetHeight) * 0.22);
    el.style.borderRadius = Math.max(6, Math.min(r, 20)) + 'px';
  }

  function render(items) {
    layer.innerHTML = '';
    (items || []).forEach(function (it) { spawn(it, false); });
  }

  function applyChrome() {
    var L = t();
    if (nameI) nameI.placeholder = L.name;
    if (msgI) msgI.placeholder = L.message;
    if (submit && !sending) submit.textContent = L.submit;
  }

  function load() {
    var cb = 'gbcb_' + Date.now();
    var s = document.createElement('script');
    window[cb] = function (data) {
      render(Array.isArray(data) ? data : []);
      try { delete window[cb]; } catch (e) { window[cb] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    };
    s.src = GB_URL + '?callback=' + cb + '&t=' + Date.now();
    document.head.appendChild(s);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = (msgI.value || '').trim();
    if (!message) return;
    var name = (nameI.value || '').trim();
    sending = true;
    submit.disabled = true;
    if (status) status.textContent = t().sending;
    fetch(GB_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ name: name, message: message }),
    }).then(function () {
      if (status) status.textContent = t().done;
      spawn({ ts: new Date().toISOString(), name: name, message: message }, true); // 바닥에서 새로 떠오름
      msgI.value = '';
      nameI.value = '';
    }).catch(function () {
      if (status) status.textContent = t().fail;
    }).finally(function () {
      sending = false;
      submit.disabled = false;
      submit.textContent = t().submit;
      setTimeout(function () { if (status) status.textContent = ''; }, 2500);
    });
  });

  // ── 입력칸 높이 리사이즈 — 바닥 핸들(.gb-resize) 드래그 ──
  var handle = form.querySelector('.gb-resize');
  if (handle && msgI) {
    handle.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      var startY = e.clientY, startH = msgI.offsetHeight;
      function move(ev) { msgI.style.height = Math.max(48, startH + (ev.clientY - startY)) + 'px'; }
      function up() {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  applyChrome();
  // 언어 전환 추적 — lang.js가 documentElement.lang을 바꾼다 (입력창 chrome만 갱신)
  new MutationObserver(applyChrome).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // 커튼이 처음 열릴 때 1회 로드 (drawer.js가 .stripe-top에 .open 토글)
  var stripe = document.querySelector('.stripe-top');
  if (stripe) {
    new MutationObserver(function () {
      if (stripe.classList.contains('open') && !loaded) { loaded = true; load(); }
    }).observe(stripe, { attributes: true, attributeFilter: ['class'] });
  }
}
