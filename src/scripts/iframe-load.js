// web 작품 미리보기 iframe — 근접 지연로드 + 연결 워밍.
//
// iframe은 남의 사이트 전체를 실시간 로드해 느리다. 체감을 줄이려고:
//   ① 모든 대상 오리진을 dns-prefetch (가벼움) — DNS 조회를 미리.
//   ② IntersectionObserver로 화면에 가까워질 때(rootMargin 600px) 비로소 src 주입.
//      바로 직전 그 오리진을 preconnect(TCP+TLS 미리) 해 첫 로드를 앞당긴다.
// loading=lazy는 브라우저 재량이라 모바일 전체 펼침에서 여러 개가 한꺼번에 뜰 수
// 있는데, 이렇게 근접 시점을 직접 제어하면 동시 로드를 줄여 부드럽게 흐른다.
// 스켈레톤(image-skel.js)이 src 주입~load 사이를 덮는다.

var warmed = {}; // 오리진별 preconnect 1회

function addLink(rel, href, cross) {
  var l = document.createElement('link');
  l.rel = rel;
  l.href = href;
  if (cross) l.crossOrigin = '';
  document.head.appendChild(l);
}

function preconnect(origin) {
  if (warmed[origin]) return;
  warmed[origin] = true;
  addLink('preconnect', origin, true);
}

export function initIframeLoad() {
  var frames = Array.prototype.slice.call(
    document.querySelectorAll('iframe.embedded-iframe[data-src]'),
  );
  if (!frames.length) return;

  // ① 대상 오리진 DNS 미리 조회 (중복 제거) — 연결 시작 지연을 줄인다.
  var origins = {};
  frames.forEach(function (f) {
    try { origins[new URL(f.getAttribute('data-src')).origin] = 1; } catch (_) {}
  });
  Object.keys(origins).forEach(function (o) { addLink('dns-prefetch', o); });

  function load(f) {
    var src = f.getAttribute('data-src');
    if (!src) return;
    f.removeAttribute('data-src');
    try { preconnect(new URL(src).origin); } catch (_) {}
    f.src = src;
  }

  // ② 관찰자 없으면(구형) 즉시 전부 로드 — 폴백.
  if (!('IntersectionObserver' in window)) {
    frames.forEach(load);
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      load(e.target);
    });
  }, { rootMargin: '600px 0px' });
  frames.forEach(function (f) { io.observe(f); });
}
