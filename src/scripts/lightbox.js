// 작품 이미지 클릭 확대 — 컴팩트한 라이트박스(별다른 효과 없이).
// 이미지를 누르면 어둑한 전면 오버레이에 원본을 화면에 맞춰 크게 띄우고,
// 아무 데나 누르거나 ESC로 닫는다. 영상(.card-video)·iframe은 대상 아님.
// 카드는 저장소(display:none)에 있어도 DOM에 있으므로 init 때 리스너가 붙고,
// 펼쳐 보일 때 정상 동작한다.

// srcset에서 가장 큰 해상도 URL을 고른다(확대 시 선명하게). 없으면 src.
function bestSrc(img) {
  var set = img.getAttribute('srcset');
  if (!set) return img.currentSrc || img.src;
  var best = null, bestW = -1;
  set.split(',').forEach(function (part) {
    var m = part.trim().match(/^(\S+)\s+(\d+)w$/);
    if (m && +m[2] > bestW) { bestW = +m[2]; best = m[1]; }
  });
  return best || img.currentSrc || img.src;
}

export function initLightbox() {
  var imgs = document.querySelectorAll('.card-images img');
  if (!imgs.length) return;

  var box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('aria-hidden', 'true');
  var big = document.createElement('img');
  big.alt = '';
  box.appendChild(big);
  document.body.appendChild(box);

  function open(img) {
    big.src = bestSrc(img);
    big.alt = img.alt || '';
    box.classList.add('open');
    document.body.classList.add('lightbox-open'); // 배경 스크롤 잠금
  }
  function close() {
    box.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    big.removeAttribute('src'); // 메모리 해제
  }

  box.addEventListener('click', close); // 오버레이(큰 이미지 포함) 클릭 = 닫기
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && box.classList.contains('open')) close();
  });

  imgs.forEach(function (im) {
    im.style.cursor = 'zoom-in';
    im.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      open(im);
    });
  });
}
