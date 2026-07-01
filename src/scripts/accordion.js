// 표 아코디언 + URL hash 동기화 + 모바일 섹션 페이저.
//
// hash 문법 (하나의 네임스페이스를 셋이 나눠 씀):
//   #<slug>               작품 펼침 (Portfolio 섹션)
//   #notepad #collection  모바일 섹션 (데스크탑은 data-section을 무시 — 무해)
//   (없음)                Portfolio 기본. 데스크탑은 닫힘, 모바일은 전체 펼침.
// → 새로고침·공유 링크에서도 모바일 섹션 상태가 유지된다.
//
// 데스크탑: 단일 펼침(탭 토글). 모바일: 게시된 행을 전부 펼친 상태로 유지 —
// 탭 토글·닫기 없음. hash로 특정 작품 진입 시엔 그 행으로 스크롤만 한다.
import { isMobileView, anchorY, glideScrollBy, springOpen, springX } from './util.js';
import { rescanWave } from './wave.js';

var SECTION_HASHES = ['portfolio', 'notepad', 'collection'];

var cards = [];
var centerContent = null; // 카드 저장소 (.center .content)
var centerEl = null;
var threeCol = null;
var accSlug = null; // 현재 열린 slug
var accRow = null;  // 현재 detail <tr>

export function accClose() {
  if (isMobileView()) return; // 모바일 — 표 전체를 펼친 상태로 유지(닫지 않음)
  var details = document.querySelectorAll('tr.accordion-detail');
  if (!details.length) { accRow = null; accSlug = null; return; }
  // 데스크탑 단일 펼침: 닫히는 활성 행을 컬럼상 제자리에 고정(점프 보정).
  // 안전하게 모든 detail 행을 거둔다. 모바일에선 centerEl이 스크롤러가 아니라
  // window 스크롤은 건드리지 않는다(스크롤 보호).
  var activeTr = accSlug ? document.querySelector('tr[data-slug="' + accSlug + '"]') : null;
  var pinTop = (!isMobileView() && activeTr && centerEl) ? activeTr.getBoundingClientRect().top : null;
  details.forEach(function (d) {
    var card = d.querySelector('.work-card');
    if (card && centerContent) centerContent.appendChild(card); // 저장소로 복귀
    if (d.parentNode) d.parentNode.removeChild(d);
  });
  document.querySelectorAll('tr[data-slug][data-active="true"]').forEach(function (tr) {
    tr.setAttribute('data-active', 'false');
    tr.setAttribute('aria-expanded', 'false');
  });
  if (pinTop !== null && activeTr && centerEl) {
    var after = activeTr.getBoundingClientRect().top;
    if (after !== pinTop) centerEl.scrollTop += after - pinTop;
  }
  accRow = null;
  accSlug = null;
  rescanWave(); // 닫혀 storage로 돌아간 카드 링크 반영 (파동 위상 일관성 유지)
}

// 표 행 아래에 카드 패널을 삽입하고 파동으로 펼친다. 닫기·스크롤 보정은 안 함 —
// 호출측이 맥락에 맞게 처리(탭=단일 펼침+핀). accSlug/accRow를 방금 연 칸으로 갱신.
// opts.animate === false → 즉시 펼침(스프링 없이). opts.rescan === false → 파동
// 재스캔 생략(전체 펼침 시 마지막에 한 번만 호출하려고).
function mountDetail(slug, opts) {
  opts = opts || {};
  var tr = document.querySelector('tr[data-slug="' + slug + '"]');
  var card = document.getElementById(slug);
  if (!tr || !card) return null;
  if (tr.getAttribute('data-active') === 'true') return null; // 이미 열림 — 중복 방지
  var detail = document.createElement('tr');
  detail.className = 'accordion-detail';
  var td = document.createElement('td');
  td.colSpan = 3;
  var panel = document.createElement('div');
  panel.className = 'accordion-panel';
  panel.appendChild(card);
  td.appendChild(panel);
  detail.appendChild(td);
  tr.parentNode.insertBefore(detail, tr.nextSibling);
  tr.setAttribute('data-active', 'true');
  tr.setAttribute('aria-expanded', 'true');
  accSlug = slug;
  accRow = detail;
  if (opts.rescan !== false) rescanWave(); // 새 카드 링크를 점멸 파동에 편입
  if (opts.animate !== false) springOpen(panel); // 파동 높이 펼침(오버슈트 후 안착)
  return tr;
}

// 모바일 — 게시된 행을 전부 즉시 펼친다(스프링 없이). 파동 재스캔은 마지막에 1회.
function expandAllMobile() {
  document
    .querySelectorAll('table.sontable tr[data-slug]:not([data-locked="true"])')
    .forEach(function (tr) {
      mountDetail(tr.getAttribute('data-slug'), { animate: false, rescan: false });
    });
  rescanWave();
}

// 탭·hash 진입 — 단일 펼침. 열기 전 행 위치를 기억했다가 기존 칸이 닫히며 생긴
// 점프를 상쇄(모바일 핀)하거나 컬럼을 글라이드(데스크탑)한다. 탭은 관성 스크롤
// 중이 아니라 핀 scrollBy가 흐름을 끊지 않는다(스크롤-드라이버 경로는 핀 없음).
function accOpen(slug) {
  var trExisting = document.querySelector('tr[data-slug="' + slug + '"]');
  if (!trExisting || !document.getElementById(slug)) return;
  if (isMobileView()) {
    // 모바일 — 이미 전부 펼침. 해당 행으로 스크롤만 한다.
    trExisting.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  accClose();
  var tr = mountDetail(slug);
  if (!tr) return;
  // 데스크탑 시점 이동 — 행을 화면 상단 ~22% 지점(anchorY)으로 글라이드.
  // (브라우저 smooth scrollTo는 호출 시점의 스크롤 한계로 clamp돼서,
  //  패널이 자라며 생기는 공간을 못 따라감 → 수동 글라이드 사용)
  glideScrollBy(centerEl, tr.getBoundingClientRect().top - anchorY(), 500);
}

// 모바일 섹션 전환 — 상태는 .three-col[data-section] 하나, 표시는 mobile.css.
// 공간 배치(좌→우)와 같은 순서 — 슬라이드 방향 계산에 쓴다.
var SECTION_ORDER = ['notepad', 'portfolio', 'collection'];
var SECTION_EL = { notepad: '.third.left', portfolio: '.third.center', collection: '.third.right' };

function setSection(name) {
  if (!threeCol || threeCol.getAttribute('data-section') === name) return;
  var from = SECTION_ORDER.indexOf(threeCol.getAttribute('data-section'));
  var to = SECTION_ORDER.indexOf(name);
  threeCol.setAttribute('data-section', name);
  if (isMobileView()) {
    window.scrollTo(0, 0); // 새 섹션은 머리띠부터
    // 들어오는 섹션이 이동 방향에서 밀려 들어와 0으로 스프링(파동)으로 정착.
    var nextEl = threeCol.querySelector(SECTION_EL[name]);
    if (nextEl) {
      var off = window.innerWidth * 0.22 * (to > from ? 1 : -1);
      springX(nextEl, off, { stiffness: 240, damping: 22, fade: true });
    }
  }
}

// hash를 바꾸고 적용 — 화살표·스와이프 공용.
// (replaceState는 hashchange를 안 쏘므로 applyHash 직접 호출)
function goSection(name) {
  history.replaceState(null, '', name === 'portfolio' ? location.pathname : '#' + name);
  applyHash();
}

// URL hash ↔ 아코디언·섹션 동기화 (직접 진입, 뒤로가기, home 링크 대응).
// 클릭 핸들러는 replaceState 후 직접 적용하므로 여기선 hashchange·초기 진입 처리.
export function applyHash() {
  var h = (location.hash || '').replace(/^#/, '');
  if (SECTION_HASHES.indexOf(h) !== -1) {
    accClose();
    setSection(h);
    return;
  }
  var hasSlug = h && cards.some(function (c) { return c.id === h; });
  if (hasSlug) {
    setSection('portfolio'); // 작품 hash 직접 진입 — 표가 있는 섹션으로
    if (accSlug !== h) accOpen(h);
  } else {
    accClose();
    setSection('portfolio');
  }
}

export function initAccordion() {
  cards = Array.from(document.querySelectorAll('.work-card'));
  centerContent = document.querySelector('.three-col .center .content');
  centerEl = document.querySelector('.three-col .center');
  threeCol = document.querySelector('.three-col');

  // 표 행 클릭 — 블록(행) 전체가 토글 단위 (메모 블록과 같은 어법).
  // 연도 등 외부 링크는 본연의 동작대로 통과.
  document.querySelectorAll('table.sontable tr[data-slug]').forEach(function (tr) {
    // 미게시(잠긴) 행 — 펼칠 수 없다. 연도 외부 링크만 본연대로 동작.
    if (tr.getAttribute('data-locked') === 'true') return;
    tr.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (a && !(a.getAttribute('href') || '').startsWith('#')) return;
      if (isMobileView()) return; // 모바일 — 전부 펼쳐 있어 행 토글 없음
      e.preventDefault();
      var slug = tr.getAttribute('data-slug');
      if (accSlug === slug) {
        accClose();
        if (location.hash) history.replaceState(null, '', location.pathname);
      } else {
        accOpen(slug);
        history.replaceState(null, '', '#' + slug);
      }
    });
  });

  // 모바일 섹션 페이저 — 머리띠 양옆 화살표.
  document.querySelectorAll('.path-arrow').forEach(function (btn) {
    btn.addEventListener('click', function () {
      goSection(btn.getAttribute('data-go'));
    });
  });

  // ── 스와이프 — 손가락을 따라오는 드래그. 끌면 섹션이 같이 움직이고,
  // 충분히 끌거나(80px+) 빠르게 튕기면(32px+ & 0.35px/ms+) 밀려나가며 전환,
  // 아니면 고무줄 복귀. 이웃 없는 방향(양끝 밖)은 1/3.5 저항.
  // 축 판정: 첫 12px 이동에서 가로/세로 우세를 한 번만 결정 — 세로 스크롤
  // 중 비스듬한 손가락에 오발동하지 않는다. 핀치 줌(멀티터치)·About 서랍
  // 열림 중엔 미발동. 전부 passive — 세로 스크롤은 touch-action: pan-y가
  // 브라우저 네이티브로 처리(mobile.css).
  var REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  var drag = null; // { x, y, t, name, el, axis, rawDx, dx, committing }

  function clearDragStyle(el) {
    el.style.transition = '';
    el.style.transform = '';
    el.style.opacity = '';
  }

  document.addEventListener('touchstart', function (e) {
    if (drag && drag.committing) return; // 전환 연출 중 — 새 제스처 무시
    drag = null;
    if (!isMobileView() || e.touches.length !== 1) return;
    if (document.querySelector('.stripe-top.open')) return;
    if (!e.target.closest || !e.target.closest('.three-col')) return;
    var cur = threeCol ? threeCol.getAttribute('data-section') : 'portfolio';
    var el = threeCol ? threeCol.querySelector(SECTION_EL[cur]) : null;
    if (!el) return;
    drag = {
      x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(),
      name: cur, el: el, axis: null, rawDx: 0, dx: 0, committing: false,
    };
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!drag || drag.committing) return;
    if (e.touches.length !== 1) { // 두 번째 손가락 = 핀치 — 드래그 취소
      clearDragStyle(drag.el);
      drag = null;
      return;
    }
    var dx = e.touches[0].clientX - drag.x;
    var dy = e.touches[0].clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return; // 아직 미결정
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (drag.axis !== 'h') return;
    drag.rawDx = dx;
    var i = SECTION_ORDER.indexOf(drag.name);
    var hasTarget = dx < 0 ? !!SECTION_ORDER[i + 1] : !!SECTION_ORDER[i - 1];
    drag.dx = hasTarget ? dx : dx / 3.5;
    drag.el.style.transform = 'translateX(' + drag.dx.toFixed(1) + 'px)';
  }, { passive: true });

  document.addEventListener('touchend', function () {
    if (!drag || drag.committing) return;
    var d = drag;
    if (d.axis !== 'h') { drag = null; return; }
    var raw = d.rawDx;
    var vel = Math.abs(raw) / Math.max(1, performance.now() - d.t);
    var i = SECTION_ORDER.indexOf(d.name);
    var next = raw < 0 ? SECTION_ORDER[i + 1] : SECTION_ORDER[i - 1];
    var commit = next && (Math.abs(raw) >= 80 || (Math.abs(raw) >= 32 && vel >= 0.35));
    if (commit) {
      if (REDUCE_MOTION.matches) {
        clearDragStyle(d.el);
        drag = null;
        goSection(next);
        return;
      }
      // 끌던 방향으로 마저 밀려나간 뒤 전환 — 들어오는 쪽은 setSection의
      // slide-in이 받는다 (나가기 0.16s → 들어오기 0.25s 페이지 넘김 감각)
      d.committing = true;
      d.el.style.transition = 'transform 0.16s ease-in, opacity 0.16s ease-in';
      d.el.style.transform = 'translateX(' + (raw < 0 ? '-70vw' : '70vw') + ')';
      d.el.style.opacity = '0';
      setTimeout(function () {
        clearDragStyle(d.el);
        drag = null;
        goSection(next);
      }, 160);
    } else {
      // 임계 미달 — 제자리로 파동(스프링) 복귀
      springX(d.el, d.dx, { stiffness: 300, damping: 24 });
      drag = null;
    }
  }, { passive: true });

  document.addEventListener('touchcancel', function () {
    if (!drag || drag.committing) return;
    clearDragStyle(drag.el);
    drag = null;
  }, { passive: true });

  if (isMobileView()) expandAllMobile(); // 모바일 — 표 전체 펼침(applyHash 전에)
  window.addEventListener('hashchange', applyHash);
  applyHash();
}
