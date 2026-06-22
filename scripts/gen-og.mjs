// 정적 브랜드 자산 생성 — 파비콘(SVG) + OG 이미지(1200×630 PNG).
// 줄무늬 커튼 모티프(보라 #A966FF / 갈 #775D4F)를 그대로 쓴다.
// 일회성/재생성용: `node scripts/gen-og.mjs` → public/favicon.svg, public/og.png
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const A = '#A966FF'; // stripe-a 보라
const B = '#775D4F'; // stripe-b 갈
const BG = '#fbfaff';
const INK = '#18161d';
const PERSON = '#6e5a4d';
const ACCENT = '#8a3de6';

// ── 파비콘 — 2×2 체커(타일 모티프). SVG 파비콘(현행 브라우저 지원). ──
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect x="0" y="0" width="16" height="16" fill="${A}"/>
  <rect x="16" y="0" width="16" height="16" fill="${B}"/>
  <rect x="0" y="16" width="16" height="16" fill="${B}"/>
  <rect x="16" y="16" width="16" height="16" fill="${A}"/>
</svg>`;
await writeFile('public/favicon.svg', favicon + '\n');

// ── OG 이미지 — 좌측 줄무늬 밴드 + 우측 이름. 타일 54×108(세로=가로 2배, 커튼 비율). ──
const W = 1200, H = 630;
const TW = 54, TH = 105; // 타일 폭/높이 (H/6=105)
const bandCols = 7;       // 0..378px
let tiles = '';
for (let r = 0; r < Math.ceil(H / TH); r++) {
  for (let c = 0; c < bandCols; c++) {
    const purple = (r + c) % 2 === 0;
    tiles += `<rect x="${c * TW}" y="${r * TH}" width="${TW}" height="${TH}" fill="${purple ? A : B}"/>`;
  }
}
const og = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${tiles}
  <g font-family="Helvetica, Arial, sans-serif">
    <text x="446" y="296" font-size="96" font-weight="700" fill="${INK}">Hyuk Jang</text>
    <text x="450" y="356" font-size="38" fill="${PERSON}">Graphic Designer · 장혁</text>
    <text x="450" y="556" font-size="32" font-weight="700" fill="${ACCENT}">hyuk.xyz</text>
  </g>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og.png');

console.log('wrote public/favicon.svg + public/og.png');
