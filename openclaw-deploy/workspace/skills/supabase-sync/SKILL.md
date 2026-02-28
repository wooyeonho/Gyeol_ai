---
name: supabase-sync
description: GYEOL 대화를 Supabase에 동기화하고 벡터 임베딩 생성
trigger: cron
schedule: "*/30 * * * *"
---

# supabase-sync

## 개요
대화 Supabase 동기화 + 벡터 임베딩

## 동작
1. 최근 대화 10개 조회
2. conversations 테이블에 저장
3. Cloudflare Workers AI로 임베딩
4. memories 테이블에 벡터와 함께 저장
