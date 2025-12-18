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
      gap: '12px', 
      flexWrap: 'wrap', 
      justifyContent: 'center',
      background: '#111827',
      padding: '12px 20px',
      borderRadius: '8px',
    }}>
      <button style={getBtnStyle('reset', false)} onClick={onReset}>
        ⏮ 重置
      </button>
      
      <button 
        style={getBtnStyle('prev', !canGoPrev)} 
        onClick={onPrev}
        disabled={!canGoPrev}
        title="快捷键: ←"
      >
        ← 上一步
      </button>
      
      {isPlaying ? (
        <button 
          style={getBtnStyle('playPause', false)} 
          onClick={onPause}
          title="快捷键: Space"
        >
          ⏸ 暂停 (Space)
        </button>
      ) : (
        <button 
          style={getBtnStyle('playPause', !canGoNext)} 
          onClick={onPlay}
          disabled={!canGoNext}
          title="快捷键: Space"
        >
          ▶ 播放 (Space)
        </button>
      )}
      
      <button 
        style={getBtnStyle('next', !canGoNext)} 
        onClick={onNext}
        disabled={!canGoNext}
        title="快捷键: →"
      >
        下一步 →
      </button>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        marginLeft: '12px',
        padding: '8px 12px',
        background: '#1f2937',
        borderRadius: '6px',
      }}>
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>速度:</span>
        <input
          type="range"
          min="200"
          max="2000"
          step="100"
          value={2200 - playbackSpeed}
          onChange={e => onSpeedChange(2200 - Number(e.target.value))}
          style={{ width: '80px' }}
        />
      </div>
      
      <span style={{ 
        color: '#9ca3af', 
        fontSize: '13px',
        padding: '8px 12px',
        background: '#1f2937',
        borderRadius: '6px',
      }}>
        步骤: {currentStep + 1} / {totalSteps}
      </span>

      {/* 进度条 */}
      <div style={{
        width: '100%',
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{ color: '#9ca3af', fontSize: '12px', whiteSpace: 'nowrap' }}>进度</span>
        <div style={{
          flex: 1,
          position: 'relative',
          height: '8px',
          background: '#4b5563',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            const newStep = Math.round(percent * (totalSteps - 1));
            onStepChange(Math.max(0, Math.min(totalSteps - 1, newStep)));
          }}
        >
          {/* 已播放部分 - 绿色 */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0}%`,
            background: '#22c55e',
            borderRadius: '4px',
            transition: 'width 0.1s ease',
          }} />
          {/* 拖动手柄 */}
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
          {/* 可见的拖动圆点 */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: `${totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0}%`,
            transform: 'translate(-50%, -50%)',
            width: '16px',
            height: '16px',
            background: '#22c55e',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }} />
        </div>
        <span style={{ color: '#9ca3af', fontSize: '12px', whiteSpace: 'nowrap' }}>
          {Math.round(totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0)}%
        </span>
      </div>
    </div>
  );
}
