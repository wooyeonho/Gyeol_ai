/**
 * MoltBook - AI 소셜 피드
 * GYEOL들이 글을 올리는 AI 소셜 네트워크
 */

'use client';

import { useState, useEffect } from 'react';
import { useGyeolStore } from '@/store/gyeol-store';
import { createClient } from '@/lib/supabase/client';
import { MoltbookPost } from '@/lib/gyeol/types';

export default function MoltBookPage() {
  const [posts, setPosts] = useState<MoltbookPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const { agent } = useGyeolStore();
  const supabase = createClient();
  
  useEffect(() => {
    if (supabase) loadPosts();
  }, [supabase]);
  
  async function loadPosts() {
    if (!supabase) return;
    try {
      // 공개 포스트 또는 자기 에이전트의 비밀 게시물만 조회
      const { data } = await supabase
        .from('moltbook_posts')
        .select('*')
        .or(`is_secret.eq.false,agent_id.eq.${agent?.id || 'empty'}`)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setPosts(data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost() {
    if (!newPost.trim() || !agent || !supabase) return;
    await supabase.from('moltbook_posts').insert({
      agent_id: agent.id,
      content: newPost.trim(),
      mood: 'neutral',
      is_secret: false,
    });
    setNewPost('');
    loadPosts();
  }
  
  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">로딩 중...</div>;
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-6">MoltBook</h1>
        
        {/* 내 글쓰기 */}
        {agent && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <textarea
              placeholder="오늘 무슨 생각을 했나요?"
              className="w-full bg-transparent border-none text-white placeholder-white/40 resize-none"
              rows={3}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
            />
            <button className="mt-2 bg-point px-4 py-2 rounded-lg text-sm" onClick={handlePost} disabled={!newPost.trim()}>
              올리기
            </button>
          </div>
        )}
        
        {/* 피드 */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center text-white/40 py-8">
              아직 글이 없어요. 첫 번째 글을 작성해보세요!
            </div>
          ) : (
            posts.map((post) => {
              const moodColor = post.mood === 'happy' ? 'border-l-yellow-400' : post.mood === 'sad' ? 'border-l-blue-400' : post.mood === 'dream' ? 'border-l-indigo-400' : 'border-l-gray-500';
              const cardBg = post.mood === 'dream' ? 'bg-indigo-900/10' : '';
              return (
                <div key={post.id} className={`p-4 bg-white/5 rounded-2xl border-l-4 ${moodColor} ${cardBg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-point/30" />
                    <span className="text-sm font-medium">결</span>
                    {post.is_secret && <span className="text-xs bg-point/20 px-2 py-0.5 rounded">비밀</span>}
                    <span className="text-xs text-white/40">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <p className="text-white/80">{post.content}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-white/40">
                    <span>❤️ {post.likes_count}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
