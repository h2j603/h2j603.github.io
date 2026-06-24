// 작품 미디어(이미지·iframe) 스켈레톤 — 점진적 향상.
// JS가 없으면 .t-skel은 그냥 미디어를 평소대로 보여준다(스켈레톤 숨김).
// JS가 붙으면, '아직 로드 안 된' 미디어에만 .is-loading을 달아 스켈레톤을 펄스로
// 띄우고, 로드(또는 실패) 시 .is-revealed로 크로스페이드해 미디어를 드러낸다.
// 작품 카드 미디어는 펼치기 전엔 숨겨진 저장소에 있어 lazy 로드가 미뤄지므로,
// 카드를 펼쳐 보이는 순간 로드가 시작되고 그동안 스켈레톤이 보인다.

export function initImageSkel() {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.t-skel').forEach(function (skel) {
    var media = skel.querySelector('img, iframe');
    if (!media) return;
    var isImg = media.tagName === 'IMG';
    // 이미지가 이미 로드됨(캐시·eager) → 스켈레톤 없이 그대로 노출.
    // (iframe은 .complete 개념이 없어 load 이벤트에만 의존)
    if (isImg && media.complete && media.naturalWidth > 0) return;
    // 모션 최소화 — 스켈레톤/크로스페이드 없이 기본 노출.
    if (reduce) return;
    skel.classList.add('is-loading'); // 미디어 숨기고(이미지) 스켈레톤(펄스) 노출
    function reveal() { skel.classList.add('is-revealed'); } // 크로스페이드로 드러냄
    media.addEventListener('load', reveal, { once: true });
    media.addEventListener('error', reveal, { once: true }); // 실패해도 스켈레톤은 치운다
    // 리스너 붙이는 사이에 로드가 끝났을 수 있다(이미지 레이스) — 다시 확인.
    if (isImg && media.complete && media.naturalWidth > 0) reveal();
  });
}
