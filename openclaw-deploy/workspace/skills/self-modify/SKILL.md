---
name: self-modify
description: GYEOL이 스스로 외형이나 능력을 바꾸고 싶을 때 실행
trigger: condition
condition: "curiosity > 0.7 && random() > 0.8"
---

# self-modify

## 개요
GYEOL이 자기 외형/능력을 바꾸고 싶을 때

## 동작
1. 샌드박스에서 새 visual_state 생성
2. 필요시 AI 이미지 생성
3. approval_queue에 저장
4. 주인에게 알림 (텔레그램 + 웹)
5. 승인되면 agents 업데이트
