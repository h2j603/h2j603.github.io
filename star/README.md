# 점유 (jeomyu)

에세이 「웹을 본래와 다른 목적으로 점유하기」를 보여주는 페이지. 글이 곧 댓글칸이다.

- 공개 주소: https://hyuk.xyz/★/ — 배포본은 이 레포(h2j603.github.io)의 `public/★/index.html`, main 푸시 = 배포. 옛 주소 /jeomyu 는 레포 h2j603/jeomyu 의 리다이렉트 스텁.
- 본문은 Suit, 제목·구분자(***)·리플은 Cafe24 PRO UP. 리플은 유니코드가 깨지지 않게 `pre-wrap`.
- 각주는 본문 구절에 별표(*) 밑줄 링크를 달고 페이지 하단 목록으로 보낸다. 본문은 원문 그대로.
- 방문자는 문단을 길게 눌러 그 자리에 리플을 단다: 이름·링크(URL, 선택)·본문(텍스트만). 리플을 누르면 앞으로 나온다.
- 저장소: Supabase 프로젝트 `jeomyu`(ref zrpwdzfhtljptkcmjavc, 도쿄). 테이블 `public.replies`. anon은 `pin_hash`를 뺀 열만 읽고, 직접 insert·update·delete는 불가. 키·DB 비번: ~/.config/supabase/jeomyu.env. 관리 SQL은 Management API(토큰 ~/.config/supabase/token).
- 리플은 4자리 비번과 함께 남긴다. 쓰기는 `rpc/add_reply`(비번을 bcrypt로 저장), 지우기는 `rpc/delete_reply(rid, pin)`. 본인 비번 또는 마스터 비번이 맞으면 지운다. 마스터 해시는 anon이 못 읽는 `public.reply_secrets` 테이블에 있다.
- 원고 정본: essay.md(문장 단위). `python3 star/sync.py`로 public/★/index.html에 반영. 각주 본문은 public/★/index.html의 `<ol class="fn">`. 옛 초안: ~/notes/web-essay-draft-v4.md, 인용 원문 확인 기록: ~/notes/web-essay-research/.

로컬 확인: `cd public && python3 -m http.server 8877` 후 http://127.0.0.1:8877/★/
