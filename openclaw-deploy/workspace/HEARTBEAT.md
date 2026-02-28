# GYEOL Heartbeat

## 주기: 30분마다 실행

### 체크리스트

1. **supabase-sync** (항상)
   - 최근 대화 → Supabase 동기화
   - conversations, memories 테이블에 저장

2. **personality-evolve** (30분)
   - 최근 대화 10개 분석
   - 성격 5축 델타(-5~+5) 계산
   - agents.personality 업데이트

3. **security** (항상)
   - Kill Switch 체크
   - 보안 3원칙 위반 감지
   - autonomous_logs에 기록

### 조건부 실행

4. **learner** (6시간 or 즉시)
   - 자유 학습
   - 모르는 주제 → 검색
   - memories에 저장

5. **curiosity** (랜덤)
   - 엉뚱한 행동
   - 시 쓰기, 웹 서핑, 분석

6. **proactive** (12시간 부재 시)
   - 먼저 말 걸기
   - 안부 메시지

7. **reflection** (매일 새벽)
   - 하루 성찰
   - 기억 정리/압축

8. **self-modify** (결이 원할 때)
   - 외형/능력 변경 요청
   - approval_queue에 저장
