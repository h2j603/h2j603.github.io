# hyuk.xyz — Are.na 백엔드 포트폴리오 사이트

콘텐츠를 Are.na 한 곳에서만 관리하고, 빌드 타임에 정적 HTML로 구워 운영하는 개인 포트폴리오 사이트.

작품·메모·수집 링크를 코드 수정 없이 한 곳에서 관리하기 위해 Are.na를 유일한 백엔드로 두었다. 런타임 API 호출을 두지 않고, `scripts/build-data.ts`가 `astro build` 전에 Are.na에서 전부 가져와 zod로 검증한 스냅샷(JSON)으로 굽는 정적 생성 구조를 택했다. 작품 하나는 Are.na 채널 하나에 대응하고, 메타데이터는 채널 description의 `key: value` 줄에 두며, 이미지는 빌드가 로컬로 내려받아 Astro 이미지 파이프라인이 처리하도록 해 원격 URL에 의존하지 않게 했다. 결과물은 GitHub Pages로 배포돼 hyuk.xyz로 운영 중이며, 화면은 메모 아코디언·작품 표·수집 링크의 3컬럼 단일 페이지로, 인터랙션은 프레임워크 없는 바닐라 JS 모듈로 분리했다.

---

**역할** · 1인 기획·디자인·구현

**스택** · Astro 5 (정적 사이트 생성) / TypeScript (strict) / 바닐라 JS 인터랙션 / Are.na v3 API (빌드 타임 단일 백엔드)

**주요 의존성** · `astro ^5.6.1` · `marked ^15.0.7` (Markdown → 시맨틱 HTML) · `zod ^3.24.2` (스키마 검증) · 빌드: `tsx`, `sharp` (이미지), `dotenv`, `typescript`

**규모** · 라이브러리 모듈 13 · 인터랙션 JS 모듈 11 · 빌드·셋업 스크립트 6 · 단일 페이지(`index.astro`)

**링크** · 라이브 [hyuk.xyz](https://hyuk.xyz) · 리포 [github.com/h2j603/h2j603.github.io](https://github.com/h2j603/h2j603.github.io)
