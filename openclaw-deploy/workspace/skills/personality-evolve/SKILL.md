---
name: personality-evolve
description: GYEOL의 성격을 대화 기반으로 진화시킴
trigger: cron
schedule: "*/30 * * * *"
---

# personality-evolve

## 개요
대화 분석 → 성격 5축 델타 계산 → agents.personality 업데이트

## 동작
1. 최근 대화 10개 분석
2. 각 주제별 성격 영향 계산 (-5 ~ +5)
3. personality JSONB 업데이트
4. Curiosity > 0.7이면 돌연변이 적용

## 성격 축
- warmth: 따뜻함
- logic: 논리성
- creativity: 창의성
- energy: 에너지
- humor: 유머
