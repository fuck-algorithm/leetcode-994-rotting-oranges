import { useEffect, useRef, useState, useCallback } from 'react';

interface ControlsProps {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  onStepChange: (step: number) => void;
}

export function Controls({
  isPlaying,
  currentStep,
  totalSteps,
  onPlay,
  onPause,
  onNext,
  onPrev,
  onReset,
  playbackSpeed,
  onSpeedChange,
  onStepChange,
}: ControlsProps) {
  const intervalRef = useRef<number | null>(null);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  // Auto-play logic
  useEffect(() => {
    if (isPlaying && currentStep < totalSteps - 1) {
      intervalRef.current = window.setInterval(() => {
        onNext();
      }, playbackSpeed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentStep, totalSteps, playbackSpeed, onNext]);

  // Auto-pause at end
  useEffect(() => {
    if (currentStep >= totalSteps - 1 && isPlaying) {
      onPause();
    }
  }, [currentStep, totalSteps, isPlaying, onPause]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        if (currentStep > 0) {
          onPrev();
          setActiveButton('prev');
          setTimeout(() => setActiveButton(null), 150);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (currentStep < totalSteps - 1) {
          onNext();
          setActiveButton('next');
          setTimeout(() => setActiveButton(null), 150);
        }
        break;
      case ' ':
        e.preventDefault();
        if (isPlaying) {
          onPause();
        } else if (currentStep < totalSteps - 1) {
          onPlay();
        }
        setActiveButton('playPause');
        setTimeout(() => setActiveButton(null), 150);
        break;
    }
  }, [currentStep, totalSteps, isPlaying, onPrev, onNext, onPlay, onPause]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getBtnStyle = (buttonId: string, disabled: boolean): React.CSSProperties => {
    const isActive = activeButton === buttonId;
    return {
      padding: '10px 18px',
      fontSize: '14px',
      border: 'none',
      borderRadius: '6px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      background: disabled ? '#4b5563' : isActive ? '#2563eb' : '#3b82f6',
      color: 'white',
      margin: '0 4px',
      transition: 'all 0.15s ease',
      transform: isActive ? 'scale(0.95)' : 'scale(1)',
      boxShadow: isActive ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none',
    };
  };

  const canGoPrev = currentStep > 0;
  const canGoNext = currentStep < totalSteps - 1;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      background: '#111827',
      padding: '6px 16px',
      borderRadius: '8px',
    }}>
      <button style={getBtnStyle('reset', false)} onClick={onReset}>⏮</button>

      <button
        style={getBtnStyle('prev', !canGoPrev)}
        onClick={onPrev}
        disabled={!canGoPrev}
        title="快捷键: ←"
      >←</button>

      {isPlaying ? (
        <button
          style={getBtnStyle('playPause', false)}
          onClick={onPause}
          title="快捷键: Space"
        >⏸</button>
      ) : (
        <button
          style={getBtnStyle('playPause', !canGoNext)}
          onClick={onPlay}
          disabled={!canGoNext}
          title="快捷键: Space"
        >▶</button>
      )}

      <button
        style={getBtnStyle('next', !canGoNext)}
        onClick={onNext}
        disabled={!canGoNext}
        title="快捷键: →"
      >→</button>

      {/* 速度控制 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: '#1f2937',
        borderRadius: '6px',
      }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>速度</span>
        <input
          type="range"
          min="200"
          max="2000"
          step="100"
          value={2200 - playbackSpeed}
          onChange={e => onSpeedChange(2200 - Number(e.target.value))}
          style={{ width: '70px' }}
        />
      </div>

      {/* 步骤计数 */}
      <span style={{
        color: '#9ca3af',
        fontSize: '11px',
        padding: '4px 8px',
        background: '#1f2937',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}>
        {currentStep + 1}/{totalSteps}
      </span>

      {/* 进度条 — 占满剩余空间，与按钮同一行，自定义渐变样式 */}
      <div style={{
        flex: 1,
        minWidth: '120px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          flex: 1,
          position: 'relative',
          height: '10px',
          background: 'linear-gradient(90deg, #1f2937, #374151)',
          borderRadius: '5px',
          cursor: 'pointer',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
        }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const newStep = Math.round(percent * (totalSteps - 1));
            onStepChange(Math.max(0, Math.min(totalSteps - 1, newStep)));
          }}
        >
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0}%`,
            background: 'linear-gradient(90deg, #f97316, #f59e0b, #22c55e)',
            borderRadius: '5px',
            transition: 'width 0.15s ease',
            boxShadow: '0 0 6px rgba(251, 191, 36, 0.4)',
          }} />
          <input
            type="range"
            min={0}
            max={totalSteps - 1}
            value={currentStep}
            onChange={(e) => onStepChange(Number(e.target.value))}
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              width: '100%',
              height: '20px',
              transform: 'translateY(-50%)',
              opacity: 0,
              cursor: 'pointer',
              margin: 0,
            }}
          />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0}%`,
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            background: 'radial-gradient(circle at 30% 30%, #fef08a, #facc15 60%, #ca8a04)',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.9)',
            animation: 'thumbGlow 1.8s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        </div>
        <span style={{
          color: '#fbbf24',
          fontSize: '11px',
          whiteSpace: 'nowrap',
          fontWeight: 'bold',
          textShadow: '0 0 4px rgba(251,191,36,0.4)',
        }}>
          {Math.round(totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0)}%
        </span>
      </div>
    </div>
  );
}
