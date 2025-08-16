import { useState, useEffect, useCallback, useRef } from 'react';
import { ConwayEngine } from '../utils/conwayEngine';
import type { ConwayConfig, ConwayState, AnimationFrame } from '../utils/types';

export const useConway = (config: ConwayConfig) => {
  const [state, setState] = useState<ConwayState>({
    grid: { width: 0, height: 0, cells: [] },
    isAnimating: false,
    currentFrame: 0,
    totalFrames: 0
  });

  const engineRef = useRef<ConwayEngine | null>(null);
  const animationRef = useRef<number | null>(null);
  const statesRef = useRef<AnimationFrame[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize engine
  useEffect(() => {
    engineRef.current = new ConwayEngine(config);
    const states = engineRef.current.generateStates();
    statesRef.current = states;
    
    setState(prev => ({
      ...prev,
      totalFrames: states.length,
      grid: {
        width: config.width,
        height: config.height,
        cells: states[0]?.grid || []
      }
    }));
  }, [config]);

  const startAnimation = useCallback(() => {
    if (!statesRef.current.length || state.isAnimating) return;

    setState(prev => ({ ...prev, isAnimating: true, currentFrame: 0 }));

    const animate = (frameIndex: number) => {
      if (frameIndex >= statesRef.current.length) {
        setState(prev => ({ ...prev, isAnimating: false }));
        return;
      }

      const currentState = statesRef.current[frameIndex];
      setState(prev => ({
        ...prev,
        currentFrame: frameIndex,
        grid: {
          width: config.width,
          height: config.height,
          cells: currentState.grid
        }
      }));

      // Use setTimeout for frame control instead of requestAnimationFrame
      timeoutRef.current = setTimeout(() => {
        animate(frameIndex + 1);
      }, config.animationSpeed);
    };

    animate(0);
  }, [config.animationSpeed, config.width, config.height, state.isAnimating]);

  const stopAnimation = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setState(prev => ({ ...prev, isAnimating: false }));
  }, []);

  const resetAnimation = useCallback(() => {
    stopAnimation();
    setState(prev => ({
      ...prev,
      currentFrame: 0,
      grid: {
        width: config.width,
        height: config.height,
        cells: statesRef.current[0]?.grid || []
      }
    }));
  }, [stopAnimation, config.width, config.height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    ...state,
    startAnimation,
    stopAnimation,
    resetAnimation,
    progress: state.totalFrames > 0 ? state.currentFrame / state.totalFrames : 0
  };
};