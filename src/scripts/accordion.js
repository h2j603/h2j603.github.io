// 표 아코디언 + URL hash 동기화 + 모바일 섹션 페이저.
//
// hash 문법 (하나의 네임스페이스를 셋이 나눠 씀):
//   #<slug>               작품 펼침 (Portfolio 섹션)
//   #notepad #collection  모바일 섹션 (데스크탑은 data-section을 무시 — 무해)
//   (없음)                Portfolio 기본, 아코디언 닫힘
// → 새로고침·공유 링크에서도 모바일 섹션 상태가 유지된다.
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
  if (!accRow) return;
  var tr = document.querySelector('tr[data-slug="' + accSlug + '"]');
  // 패널 제거로 생기는 레이아웃 점프 보정 — 닫힌 행을 화면상 제자리에 고정.
  // (다른 행으로 전환할 때도 이 핀이 점프를 막는다)
  var pinTop = tr && centerEl ? tr.getBoundingClientRect().top : null;
  var card = accRow.querySelector('.work-card');
  if (card && centerContent) centerContent.appendChild(card); // 저장소로 복귀
  if (accRow.parentNode) accRow.parentNode.removeChild(accRow);
  if (tr) {
    tr.setAttribute('data-active', 'false');
    tr.setAttribute('aria-expanded', 'false');
  }
  if (tr && centerEl && pinTop !== null) {
    var after = tr.getBoundingClientRect().top;
    if (after !== pinTop) centerEl.scrollTop += after - pinTop;
  }
  accRow = null;
  accSlug = null;
  rescanWave(); // 닫혀 storage로 돌아간 카드 링크 반영 (파동 위상 일관성 유지)
}

// 모바일 스크롤-아코디언 기준선 — 화면 높이의 이 비율 지점에 닿는 행이 열린다.
var FOCUS_LINE = 0.32;
var suppressScrollUntil = 0; // 프로그램 스크롤(탭) 동안 드라이버 잠시 정지

function accOpen(slug, opts) {
  var tr = document.querySelector('tr[data-slug="' + slug + '"]');
  var card = document.getElementById(slug);
  if (!tr || !card) return;
  accClose();
  var detail = document.createElement('tr');
  detail.className = 'accordion-detail';
  var td = document.createElement('td');
  td.colSpan = 4;
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
  // 새로 삽입된 카드 링크를 점멸 파동에 편입 (문서 순서 기준으로 위상 재부여)
  rescanWave();
  springOpen(panel); // 파동 높이 펼침 (살짝 오버슈트 후 안착)
  if (isMobileView()) {
    // 모바일: 스크롤-드라이버 호출(opts 없음)은 자체 핀 보정 → 여기선 스크롤 안 함.
    // 탭(scrollToLine)일 때만 행을 기준선으로 부드럽게 데려와 드라이버와 일관.
    if (opts && opts.scrollToLine) {
      var target = window.scrollY + (tr.getBoundingClientRect().top - window.innerHeight * FOCUS_LINE);
      suppressScrollUntil = performance.now() + 800; // 부드러운 스크롤 동안 드라이버 정지
      window.scrollTo({ top: target < 0 ? 0 : target, behavior: 'smooth' });
    }
  } else {
    // 데스크탑 시점 이동 — 행을 화면 상단 ~22% 지점(anchorY)으로 글라이드.
    // (브라우저 smooth scrollTo는 호출 시점의 스크롤 한계로 clamp돼서,
    //  패널이 자라며 생기는 공간을 못 따라감 → 수동 글라이드 사용)
    glideScrollBy(centerEl, tr.getBoundingClientRect().top - anchorY(), 500);
  }
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
      e.preventDefault();
      var slug = tr.getAttribute('data-slug');
      if (accSlug === slug) {
        accClose();
        if (location.hash) history.replaceState(null, '', location.pathname);
      } else {
        accOpen(slug, { scrollToLine: true });
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

  // ── 모바일 스크롤-아코디언 (가이드 리딩) ──────────────────────────────
  // 규칙: ① 이미 열린 아코디언이 있을 때만 작동(첫 칸은 탭으로 연다).
  // ② 그 본문(카드)을 끝까지 — 카드 바닥이 기준선(화면 FOCUS_LINE) 위로 올라갈
  //    때까지 — 읽어 내려가야 ③ '다음' 행이 열린다(맨 위가 기준선에 오게).
  // ④ 역방향(위로 스크롤)은 무시 — 닫거나 이전으로 되돌리지 않는다.
  // 새로 열릴 때마다 '재무장'(카드가 기준선 아래로 자란 뒤에야 트리거 가능)이라
  // 한 번 스크롤에 여러 칸이 우르르 열리지 않는다. 데스크탑은 window 스크롤이
  // 없어 비활성. 탭·섹션전환·About 커튼 중엔 미발동.
  var pubRows = function () {
    return Array.prototype.slice.call(
      document.querySelectorAll('table.sontable tr[data-slug]:not([data-locked="true"])'),
    );
  };
  var scrollTicking = false;
  var lastDriverY = window.scrollY;
  var armed = false;       // 카드가 기준선 아래로 자라 '읽을 거리'가 생겼나
  var lastSeenSlug = null; // 열린 칸이 바뀌면 재무장
  function onAccScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollAccordion);
  }
  function updateScrollAccordion() {
    scrollTicking = false;
    if (!isMobileView()) return;
    if (!threeCol || threeCol.getAttribute('data-section') !== 'portfolio') return;
    if (drag && (drag.axis === 'h' || drag.committing)) return; // 가로 스와이프 중
    if (performance.now() < suppressScrollUntil) return;        // 탭 부드러운 스크롤 중
    if (document.querySelector('.stripe-top.open')) return;     // About 커튼 열림
    var y = window.scrollY;
    var goingDown = y > lastDriverY + 0.5;
    lastDriverY = y;
    if (!accSlug || !accRow) return; // 열린 아코디언에서만 작동
    if (accSlug !== lastSeenSlug) { lastSeenSlug = accSlug; armed = false; } // 새 칸 → 재무장
    var line = window.innerHeight * FOCUS_LINE;
    var bottom = accRow.getBoundingClientRect().bottom; // 카드(본문) 바닥
    if (!armed) {
      // 카드가 기준선 아래로 자라 읽을 내용이 생기면 무장 (그 전엔 트리거 금지)
      if (bottom > line) armed = true;
      return;
    }
    if (!goingDown) return;        // ④ 역방향 막기 — 아래로 읽어내릴 때만
    if (bottom > line) return;     // ② 아직 본문 끝(카드 바닥)이 기준선 위로 안 옴
    // ③ 끝까지 읽음 → 다음 게시 행 열기
    var rows = pubRows();
    var idx = rows.indexOf(document.querySelector('tr[data-slug="' + accSlug + '"]'));
    var nextTr = idx >= 0 ? rows[idx + 1] : null;
    if (!nextTr) return;           // 마지막 칸 — 다음 없음
    accOpen(nextTr.getAttribute('data-slug')); // 현재 닫고 다음 열기(모바일 자체 스크롤 안 함)
    // 다음 행 맨 위를 기준선에 정렬 — locked(published:false)가 사이에 끼면 그만큼
    // 위로 당겨 시각적으로도 건너뛴다(다음 게시작은 pubRows가 이미 고름).
    var bt = nextTr.getBoundingClientRect().top;
    if (Math.abs(bt - line) > 0.5) { window.scrollBy(0, bt - line); lastDriverY = window.scrollY; }
  }
  window.addEventListener('scroll', onAccScroll, { passive: true });

  window.addEventListener('hashchange', applyHash);
  applyHash();
}
