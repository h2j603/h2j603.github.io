# hyuk.xyz 아카이빙 매뉴얼

이 사이트의 **모든 콘텐츠는 [Are.na](https://www.are.na)에 저장**됩니다. 작업을 추가·수정·정리하는 일은 전부 Are.na에서 하고, 코드는 빌드 시점에 Are.na를 읽어 정적 HTML로 굳혀 배포합니다. 즉 **Are.na = 아카이브(원본), 사이트 = 그 스냅샷**입니다.

> 런타임에는 외부 API 호출이 없습니다. 모든 fetch는 빌드 때 한 번 일어나고, 이미지도 그때 로컬로 내려받아 사이트에 포함됩니다.

---

## 1. 전체 흐름 (한눈에)

```
Are.na (원본 아카이브)
   │   index 채널(works) ── 각 작업 = 연결된 하위 채널
   │   intro 채널(hyuk-intro) / footer 채널(hyuk-footer)
   ▼
scripts/build-data.ts   ← 빌드 시 Are.na를 읽어
   │   · 검증된 스냅샷 src/data/works.json 생성
   │   · 이미지/썸네일을 src/assets/works/<slug>/ 로 다운로드
   ▼
astro build             ← 스냅샷으로 정적 HTML 생성 → dist/
   ▼
GitHub Actions(deploy.yml) ← main에 push되면 빌드+배포 → hyuk.xyz
```

핵심: **Are.na만 고치면 됩니다.** 코드는 대부분 건드릴 필요 없습니다. (재빌드는 GitHub Actions가, 또는 로컬에서.)

---

## 2. Are.na 구조

세 종류의 채널을 씁니다.

| 채널 | 기본 슬러그 | 역할 | 환경변수 |
|---|---|---|---|
| **index** | `works` | 작업 목록. 각 작업을 **하위 채널 블록으로 연결** | `ARENA_INDEX_CHANNEL` |
| **intro** | `hyuk-intro` | 좌측 About 본문 (텍스트 블록들) | `ARENA_INTRO_CHANNEL` |
| **footer** | `hyuk-footer` | 좌측 하단 footer 본문 | `ARENA_FOOTER_CHANNEL` |

**한 작업 = Are.na 채널 하나.** 그 채널을 `works`(index) 채널 안에 끌어다 넣으면(연결하면) 사이트에 등장합니다.

```
works (index 채널)
 ├── [채널] 가짜 미신을 만드는 방법 / How to Make a Fake Superstition
 ├── [채널] 지옥 삼면
 ├── [채널] Memodummy
 └── ...
```

---

## 3. 작업 하나 추가하기 (단계별)

### ① 작업 채널 만들고 index에 연결
1. Are.na에서 새 채널을 만든다.
2. 그 채널을 `works` 채널 안으로 드래그해 **연결(connect)** 한다. → 이게 "아카이브에 등재"하는 행위.

### ② 채널 이름 = 제목
채널 이름이 작업 제목이 됩니다. **한국어 / 영어** 를 `/`로 구분:

```
가짜 미신을 만드는 방법 / How to Make a Fake Superstition
```
- `/` 앞 = 한국어 제목, 뒤 = 영어 제목.
- `/`가 없으면 한·영 동일하게 처리.
- (채널 이름을 쓰므로 이름만 바꿔도 즉시 반영됩니다.)

### ③ 콘텐츠 블록 넣기 — 채널 안에 그냥 올리면 됨
채널에 올린 블록의 **종류**로 역할이 자동 분류됩니다(채널 안의 순서가 곧 사이트 순서):

- **이미지 블록** → 작업 이미지. 원하는 만큼, 올린 순서대로.
  - 블록 설명(description)을 적으면 이미지 캡션이 됩니다.
- **텍스트 블록** → 본문(설명). **Markdown** 지원(`**굵게**`, `*기울임*`, `[링크](url)`, `## 제목`, `- 목록`).
  - **언어 마커:** 텍스트 블록 **첫 줄**에 `## ko` 또는 `## en` 을 적으면 한/영으로 분류됩니다(마커 줄은 본문에서 제거됨).
  - **ko 블록 바로 다음에 en 블록**이 오면 사이트에서 좌우 2단(데스크탑)으로 짝지어 보여줍니다. 마커가 없으면 단독(1단).
- **링크 블록** → 바깥으로 나가는 링크.
  - 링크가 하나라도 있으면 그 작업엔 **`web` 태그가 자동으로** 붙습니다.
  - Are.na가 만든 썸네일을 로컬로 내려받아 씁니다.
  - 사이트에선 해당 링크 페이지를 **iframe으로 임베드**해 보여줍니다(이미지 대신).

### ④ 메타데이터 = 채널 설명(description)
채널의 **설명란**에 `key: value` 한 줄씩 적습니다(§4 참고). 예:

```
slug: fake-superstition
year: 2024
tags: editorial, poster
cover: 2
layout: 1, 2, 2

이 줄처럼 콜론 없는 문장은 메타데이터가 아니라 설명문으로 간주되어 무시됩니다.
```

> 콜론(`:`)이 있고 key가 단순 식별자(영문/숫자/`_`)인 줄만 메타데이터로 인식됩니다. 그래서 **메모/설명문과 필드를 같은 설명란에 섞어 써도** 됩니다.

---

## 4. 메타데이터 키 (채널 설명에 입력)

모두 **선택**입니다. 없으면 기본값/자동 추론.

| 키 | 의미 | 예 | 기본/비고 |
|---|---|---|---|
| `slug` | URL/식별자 | `fake-superstition` | 없으면 Are.na 채널 슬러그 사용 |
| `title` | 제목 | — | 보통 채널 이름이 우선이라 불필요 |
| `year` | 연도 | `2024` | 표·상세에 표시 |
| `medium` | 매체 | `Risograph` | 상세 메타 |
| `size` | 크기 | `420×594mm` | 상세 메타 |
| `client` | 클라이언트 | `Ahn Graphics` | 상세 메타 |
| `order` | 정렬 순서(작을수록 앞) | `10` | 기본 `9999`, 동률이면 slug 순 |
| `tags` | 분류 태그(쉼표 구분) | `editorial, poster` | §5 |
| `cover` | 대표 이미지 번호(1부터) | `2` | §6 |
| `layout` | 이미지 그리드 단 구성 | `2, 1, 3` | §7 |
| `published` | 게시 여부 | `false` | `false`면 사이트에서 제외(아카이브엔 유지) |

---

## 5. 분류 태그

고정된 5가지 어휘만 인정됩니다(그 외 토큰은 경고와 함께 무시):

```
identity · editorial · poster · type · web
```

- 여러 개 가능: `tags: identity, poster`
- **`web`은 링크 블록이 있는 작업에 자동 추가**됩니다(직접 안 적어도 됨).
- 표의 카테고리 칸엔 한 작업의 **모든 태그**가 표시됩니다(non-web 먼저, web 맨 뒤).
- 우측 표 위 필터(All / 태그들)는 실제로 쓰인 태그만 노출됩니다.

> 태그 종류를 바꾸려면 코드의 `src/lib/schema.ts`의 `TAGS` 배열을 수정해야 합니다(코드 변경).

---

## 6. 커버(대표) 이미지 선택 규칙

표/목록 썸네일에 쓰일 대표 이미지는 이 순서로 정해집니다:

1. `cover: N` 메타데이터가 있으면 **N번째 이미지**(1부터). 범위를 벗어나면 경고 + 첫 이미지.
2. 없으면 **첫 번째 이미지**.
3. 이미지가 하나도 없으면 **첫 번째 링크 썸네일**.

---

## 7. 이미지 그리드 레이아웃 (`layout`)

기본은 한 장씩 세로로 쌓입니다. `layout`으로 각 행의 **단(컬럼) 수**를 지정할 수 있습니다.

```
layout: 2, 1, 3
```
→ 1행에 2장(2단), 2행에 1장, 3행에 3장 순서로 배치.

- 숫자들의 **합이 이미지 총 개수와 같아야** 적용됩니다. 다르면 경고 + 무시(기본 1단 stack).
- 이미지 사이 간격은 상하·좌우 모두 동일(8px)합니다.

---

## 8. 작업 숨기기 / 임시저장

- 채널 설명에 `published: false` → **사이트에서 제외**되지만 Are.na 아카이브엔 그대로 남습니다. (초안·보류 작업 보관용)
- 다시 `published: true`(또는 그 줄 삭제)로 되돌리면 다음 빌드에 다시 등장.

---

## 9. 빌드 & 배포

### 자동 (권장)
`main` 브랜치에 push되면 GitHub Actions(`.github/workflows/deploy.yml`)가:
1. Are.na를 fetch해 `works.json` + 이미지 다운로드,
2. `astro build`로 정적 사이트 생성,
3. GitHub Pages로 배포 → **hyuk.xyz**.

> **Are.na 내용만 바꾼 경우**(코드 변경 없음)에도 사이트에 반영하려면 재빌드가 필요합니다. 빈 커밋을 push하거나, Actions에서 워크플로를 수동 실행하면 됩니다.

배포에 쓰이는 토큰: 리포 시크릿 `ARENA_TOKEN`(읽기 권한이면 충분), 그리고 `ARENA_INDEX_CHANNEL` 등 환경변수.

### 로컬에서 직접
```bash
npm install
cp .env.example .env          # ARENA_TOKEN, ARENA_INDEX_CHANNEL 입력
npm run check:arena           # dry-run: Are.na 읽어 리포트만 (아무것도 안 씀)
npm run build                 # Are.na fetch + astro build → dist/
npm run preview               # dist/ 미리보기
npm run build:nofetch         # 기존 works.json으로 astro build만
```

> `setup:arena`(채널 구조 부트스트랩)는 **write 권한 토큰**이 필요합니다.

---

## 10. 안전장치 / 알아둘 점

- **작업 단위 에러 격리:** 채널 하나가 잘못돼도 경고만 남기고 **건너뛰며**, 전체 빌드를 깨지 않습니다.
- **원격 URL을 사이트에 박지 않음:** 이미지/썸네일은 항상 로컬로 내려받아 포함합니다(Are.na가 다운돼도 사이트는 멀쩡).
- **본문 `[object Object]` 가드:** 마크다운 변환 결과를 방어적으로 검사합니다.
- 텍스트 블록의 단일 줄바꿈(Enter)은 `<br>`로 변환됩니다(Are.na에 타이핑한 그대로). 문단을 이어 쓰려면 줄바꿈 없이 작성.

---

## 11. 자주 하는 작업 — 빠른 참조

| 하고 싶은 것 | Are.na에서 할 일 |
|---|---|
| 작업 추가 | 채널 만들기 → `works`에 연결 → 이미지/텍스트/링크 블록 올리기 → 설명에 메타데이터 |
| 제목 수정 | 채널 이름 변경 (`한글 / English`) |
| 한·영 본문 | 텍스트 블록 첫 줄에 `## ko` / `## en`, ko 다음 en 순서로 |
| 외부 링크/웹 작업 | 링크 블록 추가 (→ `web` 자동, iframe 임베드) |
| 순서 바꾸기 | 설명에 `order: 숫자` |
| 카테고리 지정 | 설명에 `tags: poster, editorial` |
| 대표 썸네일 고르기 | 설명에 `cover: N` |
| 이미지 단 배치 | 설명에 `layout: 2,1,3` |
| 작업 숨기기 | 설명에 `published: false` |
| 사이트 반영 | `main`에 빈 커밋 push 또는 Actions 수동 실행(재빌드) |

---

## 관련 코드 (참고)

| 파일 | 역할 |
|---|---|
| `src/lib/config.ts` | 환경변수·채널 슬러그 기본값 |
| `src/lib/arena.ts` | Are.na v3 클라이언트 + 설명 메타데이터 파서 |
| `src/lib/intro.ts` | `## ko`/`## en` 마커 파싱 (본문·intro·footer 공용) |
| `src/lib/images.ts` | 블록 분류(image/link/text) + 다운로드 캐시 |
| `src/lib/works.ts` | 채널 → 검증된 `Work[]` 오케스트레이션(작업별 에러 격리) |
| `src/lib/schema.ts` | `Work` zod 스키마(원본 진실) + `TAGS` |
| `scripts/build-data.ts` | 빌드 시 데이터 단계 (`--dry-run` 지원) |
| `scripts/setup-arena.ts` | Are.na 구조 부트스트랩(write 토큰 필요) |
