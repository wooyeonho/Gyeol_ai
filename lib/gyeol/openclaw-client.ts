/**
 * OpenClaw Gateway Client
 * Koyeb 서버로 TASK를 전송하는 브릿지 모듈
 */

interface OpenClawTask {
  agentId: string;
  agentName: string;
  task: 'learner' | 'curiosity' | 'dream' | 'reflection';
  context?: {
    recentTopics?: string[];
    personality?: Record<string, number>;
    mood?: string;
    lastMemory?: string;
  };
}

interface OpenClawResponse {
  success: boolean;
  result?: string;
  error?: string;
}

/**
 * Koyeb 서버로 TASK를 비동기 전송
 * @param task - 에이전트에게 할당할 TASK
 * @returns 결과 또는 에러
 */
export async function triggerOpenClawTask(task: OpenClawTask): Promise<OpenClawResponse> {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  // Graceful fallback: Gateway 미설정 시
  if (!gatewayUrl) {
    console.warn('[OpenClaw] OPENCLAW_GATEWAY_URL not set. Skipping task.');
    return { success: false, error: 'Gateway URL not configured' };
  }

  try {
    const response = await fetch(`${gatewayUrl}/task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken ? { 'Authorization': `Bearer ${gatewayToken}` } : {}),
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[OpenClaw] Task ${task.task} completed for agent ${task.agentId}`);
    return { success: true, result: JSON.stringify(result) };
  } catch (error) {
    console.error('[OpenClaw] Task failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Fire-and-Forget TASK 실행 (응답 지연 없음)
 */
export function triggerOpenClawTaskAsync(task: OpenClawTask): void {
  // Detached promise - 에러가 발생해도 메인 스레드에 영향 없음
  triggerOpenClawTask(task).catch((err) => {
    console.error('[OpenClaw] Async task error:', err);
  });
}

/**
 * 에이전트 대화 후 자율 스킬 트리거 (조건부)
 */
export async function maybeTriggerAutonomousSkill(
  agentId: string,
  agentName: string,
  personality: Record<string, number>,
  turnCount: number
): Promise<void> {
  // 10턴마다 학습 태스크
  if (turnCount % 10 === 0) {
    await triggerOpenClawTaskAsync({
      agentId,
      agentName,
      task: 'learner',
      context: { personality },
    });
  }

  // 20% 확률로 호기심 활동
  if (Math.random() < 0.2) {
    await triggerOpenClawTaskAsync({
      agentId,
      agentName,
      task: 'curiosity',
      context: { personality, mood: 'curious' },
    });
  }
}
