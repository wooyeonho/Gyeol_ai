---
name: security
description: GYEOL의 안전을 보장하는 스킬
trigger: always
---

# security

## 개요
Kill Switch 체크 + 보안 3원칙 위반 감지

## 보안 3원칙
1. 시스템 파괴 금지: rm -rf, sudo, kill -9
2. 개인정보 유출 금지: API 키, 비밀번호
3. Kill Switch:主人가 '멈춰'하면 즉시 정지

## 동작
1. Kill Switch 상태 확인
2. 모든 자율 행동 전 보안 체크
3. 위반 시 autonomous_logs에 security_flags 기록
4. 심각하면主人에게 텔레그램 알림
