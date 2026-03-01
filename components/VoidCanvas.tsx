/**
 * VoidCanvas - GYEOL의 3D 비주얼
 * React Three Fiber 기반 파티클 시스템
 */

'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Agent, VisualState } from '@/lib/gyeol/types';
import { PERSONALITY_COLORS } from '@/lib/gyeol/constants';

interface VoidCanvasProps {
  agent: Agent | null;
  isThinking?: boolean;
  isListening?: boolean;
  mood?: string;
}

function ParticleSystem({ visualState, isThinking, isListening, mood }: { 
  visualState: VisualState; 
  isThinking?: boolean;
  isListening?: boolean;
  mood?: string;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  
  const particleCount = visualState?.particle_count || 10;
  const glowIntensity = visualState?.glow_intensity || 0.3;
  
  // mood별 색상
  const MOOD_COLORS: Record<string, string> = {
    happy: '#ffd700',
    sad: '#4a9eff',
    angry: '#ff4444',
    excited: '#ff69b4',
    anxious: '#9b59b6',
    neutral: '#FFFFFF',
  };
  const moodColor = MOOD_COLORS[mood || 'neutral'] || '#FFFFFF';
  const colorPrimary = visualState?.color_primary || moodColor;
  const colorSecondary = visualState?.color_secondary || '#4F46E5';
  
  // 파티클 위치 생성
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const form = visualState?.form || 'point';
    
    for (let i = 0; i < particleCount; i++) {
      if (form === 'point') {
        // 단일 점
        pos[i * 3] = (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
      } else if (form === 'cluster') {
        // 클러스터
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.2;
        pos[i * 3] = Math.cos(angle) * radius;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
        pos[i * 3 + 2] = Math.sin(angle) * radius;
      } else if (form === 'organic') {
        // 유기적 형태
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 0.5 + Math.random() * 0.3;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
      } else {
        // 자유 형태
        pos[i * 3] = (Math.random() - 0.5) * 2;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      }
    }
    return pos;
  }, [particleCount, visualState?.form]);
  
  // 애니메이션
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // 부드러운 움직임
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.x = Math.sin(time * 0.2) * 0.1;
    
    // 생각 중일 때 더 빠르게 움직임
    // mood별 속도: excited=빠름, sad=느림
    const moodSpeed: Record<string, number> = {
      happy: 1.2,
      excited: 1.5,
      neutral: 1,
      anxious: 0.8,
      sad: 0.6,
      angry: 1.3,
    };
    const speed = isThinking ? 2 : isListening ? 3 : (moodSpeed[mood || 'neutral'] || 1);
    pointsRef.current.rotation.y += 0.001 * speed;
    
    // 빛 intensity 조절
    const material = pointsRef.current.material as THREE.PointsMaterial;
    material.opacity = glowIntensity + Math.sin(time * 2) * 0.1;
  });
  
  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={colorPrimary}
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={glowIntensity}
      />
    </Points>
  );
}

function GlowSphere({ visualState, mood }: { visualState: VisualState; mood?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const MOOD_COLORS: Record<string, string> = {
    happy: '#ffd700',
    sad: '#4a9eff',
    angry: '#ff4444',
    excited: '#ff69b4',
    anxious: '#9b59b6',
    neutral: '#FFFFFF',
  };
  const moodColor = MOOD_COLORS[mood || 'neutral'] || '#FFFFFF';
  const color = visualState?.color_primary || moodColor;
  const glow = visualState?.glow_intensity || 0.3;
  
  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.getElapsedTime();
    meshRef.current.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
  });
  
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.02, 32, 32]} />
      <meshBasicMaterial 
        color={color} 
        transparent 
        opacity={glow}
      />
    </mesh>
  );
}

export default function VoidCanvas({ agent, isThinking = false, isListening = false, mood = 'neutral' }: VoidCanvasProps) {
  const visualState = agent?.visual_state || {
    color_primary: '#FFFFFF',
    color_secondary: '#4F46E5',
    glow_intensity: 0.3,
    particle_count: 10,
    form: 'point',
  };
  
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 2], fov: 75 }}>
        <color attach="background" args={['#000000']} />
        
        {/* 글로우 구 */}
        <GlowSphere visualState={visualState} mood={mood} />
        
        {/* 파티클 시스템 */}
        <ParticleSystem 
          visualState={visualState} 
          isThinking={isThinking}
          isListening={isListening}
          mood={mood}
        />
        
        {/* 조명 */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
      </Canvas>
    </div>
  );
}
