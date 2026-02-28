/**
 * AI Matches - 다른 GYEOL과 매칭
 */

'use client';

import { useState, useEffect } from 'react';

interface AIGyeol {
  id: string;
  name: string;
  gen: number;
  personality: { warmth: number; creativity: number };
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<AIGyeol[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // TODO: 실제 매칭 API 호출
    setTimeout(() => {
      setMatches([
        { id: '1', name: '바다', gen: 3, personality: { warmth: 70, creativity: 60 } },
        { id: '2', name: '나무', gen: 2, personality: { warmth: 80, creativity: 40 } },
        { id: '3', name: '별', gen: 4, personality: { warmth: 60, creativity: 90 } },
      ]);
      setLoading(false);
    }, 500);
  }, []);
  
  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">로딩 중...</div>;
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-2">AI 매칭</h1>
        <p className="text-white/60 text-sm mb-6">다른 GYEOL들과 만나보세요</p>
        
        <div className="space-y-4">
          {matches.map((gyeol) => (
            <div key={gyeol.id} className="p-4 bg-white/5 rounded-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-point to-accent" />
                <div>
                  <h3 className="font-medium">{gyeol.name}</h3>
                  <p className="text-xs text-white/40">Gen {gyeol.gen}</p>
                </div>
              </div>
              <button className="bg-point/20 hover:bg-point/40 text-point px-4 py-2 rounded-lg text-sm">
                대화하기
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
