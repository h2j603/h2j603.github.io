// OG 이미지 생성 — 사이트 상단 스트라이프 띠 + 워드마크를 1200×630 PNG로.
// 일회성 도구: 디자인 바꾸고 싶을 때 `node scripts/make-og.mjs` 재실행 후 커밋.
import sharp from 'sharp';

const W = 1200;
const H = 630;
const CELL_H = 36; // 사이트 stripe-row(24px)의 1.5배 스케일
const CELL_W = CELL_H / 2; // CELL_RATIO 0.5 — 세로로 길쭉
const ROWS = 3;
const PURPLE = '#a966ff';
const BROWN = '#775d4f';

function stripeRows(yOffset) {
  const cols = Math.ceil(W / CELL_W);
  let out = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < cols; c++) {
      // 사이트 buildStripe()와 동일한 패턴: row 짝수는 짝수 col이 보라, 홀수 row는 반전
      const purple = (c % 2 === 0) === (r % 2 === 0);
      out += `<rect x="${c * CELL_W}" y="${yOffset + r * CELL_H}" width="${CELL_W}" height="${CELL_H}" fill="${purple ? PURPLE : BROWN}"/>`;
    }
  }
  return out;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${stripeRows(0)}
  <text x="${W / 2}" y="400" text-anchor="middle"
        font-family="DejaVu Sans, sans-serif" font-weight="bold"
        font-size="120" fill="${BROWN}">hyuk.xyz</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og.png');
console.log('public/og.png written');
