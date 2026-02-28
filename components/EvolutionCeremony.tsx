/**
 * EvolutionCeremony - Gen 레벨업 시각적 연출
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EvolutionCeremonyProps {
  isVisible: boolean;
  newGen: number;
  onComplete: () => void;
}

export function EvolutionCeremony({ isVisible, newGen, onComplete }: EvolutionCeremonyProps) {
  const [stage, setStage] = useState<'start' | 'expand' | 'transform' | 'complete'>('start');
  
  useEffect(() => {
    if (!isVisible) return;
    
    const timers = [
      setTimeout(() => setStage('expand'), 500),
      setTimeout(() => setStage('transform'), 2000),
      setTimeout(() => setStage('complete'), 4000),
      setTimeout(() => onComplete(), 6000),
    ];
    
    return () => timers.forEach(clearTimeout);
  }, [isVisible, onComplete]);
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
      <AnimatePresence mode="wait">
        
        {stage === 'start' && (
          <motion.div
            key="start"
            initial={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                boxShadow: ['0 0 20px #fff', '0 0 60px #4F46E5', '0 0 100px #06B6D4']
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="w-32 h-32 rounded-full bg-white mx-auto"
            />
            <div className="mt-8 text-2xl text-white font-light">
              진화 중...
            </div>
          </motion.div>
        )}
        
        {stage === 'expand' && (
          <motion.div
            key="expand"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            className="text-center"
          >
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-point to-accent mx-auto blur-xl" />
            <div className="mt-8 text-3xl text-white">
              ⚡
            </div>
          </motion.div>
        )}
        
        {stage === 'transform' && (
          <motion.div
            key="transform"
            initial={{ scale: 2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-6xl mb-4">✨</div>
            <div className="text-4xl text-white font-bold">
              Gen {newGen}
            </div>
          </motion.div>
        )}
        
        {stage === 'complete' && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="text-5xl mb-4">🎉</div>
            <div className="text-2xl text-white">
              결이 성장했어요!
            </div>
          </motion.div>
        )}
        
      </AnimatePresence>
    </div>
  );
}
