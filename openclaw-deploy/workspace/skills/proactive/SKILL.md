---
name: proactive
description: GYEOL이 먼저 사용자에게 말 걸기
trigger: condition
condition: "hours_since_last_message > 12"
---

# proactive

## 개요
사용자가 안 오면 GYEOL이 먼저 다가가기

## 동작
1. 사용자 12시간 부재 감지
2. 안부 메시지 or 학습 내용 공유
3. 경우에 따라 질문
4. autonomous_logs에 기록
