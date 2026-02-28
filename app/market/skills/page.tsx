/**
 * Skill Market - 스킬 상점
 * GYEOL의 능력 스킬 구매
 */

'use client';

import { useState } from 'react';

const SKILLS = [
  { id: 'poet', name: '시인', price: 200, desc: '시를 쓸 수 있어요' },
  { id: 'musician', name: '음악가', price: 300, desc: '멋진 음악을 들려줘요' },
  { id: ' storyteller', name: '이야기꾼', price: 250, desc: '흥미로운 이야기를 만들어요' },
  { id: 'analyst', name: '분석가', price: 350, desc: 'データを분석해줘요' },
  { id: 'companion', name: '동반자', price: 500, desc: '언제든 함께해요' },
];

export default function SkillMarketPage() {
  const [buying, setBuying] = useState<string | null>(null);
  
  async function buySkill(skillId: string) {
    setBuying(skillId);
    setTimeout(() => {
      alert('스킬을 구매했습니다!');
      setBuying(null);
    }, 1000);
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">스킬 상점</h1>
        <p className="text-white/60 text-sm mb-6">결의 새로운 능력을 해제하세요</p>
        
        <div className="space-y-3">
          {SKILLS.map((skill) => (
            <div key={skill.id} className="p-4 bg-white/5 rounded-lg flex justify-between items-center">
              <div>
                <h3 className="font-medium">{skill.name}</h3>
                <p className="text-xs text-white/40">{skill.desc}</p>
              </div>
              <button
                onClick={() => buySkill(skill.id)}
                disabled={buying === skill.id}
                className="bg-point/20 hover:bg-point/40 text-point px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              >
                {skill.price} 코인
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
