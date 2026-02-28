/**
 * EnergyBar - 에너지 표시 바
 */

'use client';

interface EnergyBarProps {
  energy: number; // 0-100
  condition?: string;
}

export function EnergyBar({ energy, condition = 'normal' }: EnergyBarProps) {
  // 색상 결정
  let colorClass = 'bg-green-500';
  if (energy <= 20) colorClass = 'bg-red-500 animate-pulse';
  else if (energy <= 50) colorClass = 'bg-yellow-500';
  
  // 컨디션 이모지
  const conditionEmoji: Record<string, string> = {
    good: '😊',
    normal: '😐',
    bad: '😫',
    sleepy: '😴',
  };
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{conditionEmoji[condition] || '😐'}</span>
      <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${energy}%` }}
        />
      </div>
      <span className="text-xs text-white/60">{energy}%</span>
    </div>
  );
}

/**
 * IntimacyDisplay - 친밀도 표시
 */

interface IntimacyDisplayProps {
  score: number; // 0-100
}

export function IntimacyDisplay({ score }: IntimacyDisplayProps) {
  const hearts = Math.ceil(score / 20); // 0-5 하트
  
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs">❤️</span>
      <span className="text-xs text-white/60">{score}</span>
    </div>
  );
}
