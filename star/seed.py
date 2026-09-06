#!/usr/bin/env python3
"""작가 본인 리플 시드. 실행: python3 seed.py [--delete]  (pin은 환경변수 JEOMYU_PIN)"""
import json, os, sys, urllib.request

SB = "https://zrpwdzfhtljptkcmjavc.supabase.co"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycHdkemZodGxqcHRrY21qYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNDE5NzAsImV4cCI6MjEwMzkxNzk3MH0.fwt2xR6usefPWY03EgDewXCxzk0WLHbTxw_Ee2sbxW0"
H = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}
WHO, FARM = "장혁", "https://hyuk.xyz"

# p는 0부터(¶1=0). x,y는 문단 박스 안 % 위치.
SEEDS = [
    dict(p=1, x=48, y=6, body="●○●○●○●○●\n○ 평민 장혁 ○\n● 공작 되면 갈게요 ●\n●○●○●○●○●"),
    dict(p=2, x=52, y=28, body="★☆★☆★☆★☆★\n☆ 잘 보고 가요 ☆\n★ 답례 리플 남김 ★\n★☆★☆★☆★☆★"),
    dict(p=4, x=6, y=60, body="■□■□■□■□■\n□ 여기 살아요 □\n■□■□■□■□■"),
    dict(p=7, x=50, y=0, body="★ ─ │ ● ◆\n지금도 된다\n◆ ● │ ─ ★"),
]


def call(fn, row):
    req = urllib.request.Request(f"{SB}/rest/v1/rpc/{fn}", data=json.dumps(row).encode(), headers=H, method="POST")
    with urllib.request.urlopen(req) as r:
        return r.read().decode()

if __name__ == "__main__":
    PIN = os.environ.get("JEOMYU_PIN") or sys.exit("JEOMYU_PIN 없음")
    if "--delete" in sys.argv:
        req = urllib.request.Request(f"{SB}/rest/v1/replies?select=id,who,body&who=eq.{urllib.request.quote(WHO)}", headers=H)
        rows = json.load(urllib.request.urlopen(req))
        for r in rows:
            print("삭제", r["id"], call("delete_reply", {"rid": r["id"], "pin": PIN}))
    else:
        for s in SEEDS:
            row = dict(p=s["p"], x=s["x"], y=s["y"], who=WHO, farm=FARM, body=s["body"], reply_to=None, pin=PIN)
            print("추가 ¶%d" % (s["p"] + 1), call("add_reply", row))
