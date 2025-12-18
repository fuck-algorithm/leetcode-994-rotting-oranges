import { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { GridVisualizer } from './components/GridVisualizer';
import { Controls } from './components/Controls';
import { StatePanel } from './components/StatePanel';
import { InputPanel } from './components/InputPanel';
import { CodePanel } from './components/CodePanel';
import { QueuePanel } from './components/QueuePanel';
import { FloatingQRCode } from './components/FloatingQRCode';
import { generateSteps } from './algorithm/rottingOranges';
import { CellState, AlgorithmResult, AlgorithmPhase } from './algorithm/types';

// GitHub 仓库地址
const GITHUB_URL = 'https://github.com/fuck-algorithm/leetcode-994-rotting-oranges';

// 生成随机网格
function generateRandomGrid(rows: number, cols: number): CellState[][] {
  const grid: CellState[][] = [];
  let hasRotten = false;
  let hasFresh = false;
  
  for (let r = 0; r < rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < cols; c++) {
      // 随机生成: 0(空) 20%, 1(新鲜) 50%, 2(腐烂) 30%
      const rand = Math.random();
      if (rand < 0.2) {
        row.push(CellState.EMPTY);
      } else if (rand < 0.7) {
        row.push(CellState.FRESH);
        hasFresh = true;
      } else {
        row.push(CellState.ROTTEN);
        hasRotten = true;
      }
    }
    grid.push(row);
  }
  
  // 确保至少有一个腐烂橘子和一个新鲜橘子
  if (!hasRotten && rows > 0 && cols > 0) {
    grid[0][0] = CellState.ROTTEN;
  }
  if (!hasFresh && rows > 0 && cols > 1) {
    grid[0][cols - 1] = CellState.FRESH;
  }
  
  return grid;
}

// 默认使用 10×10 的随机网格
const DEFAULT_GRID = generateRandomGrid(10, 10);

function App() {
  const [grid, setGrid] = useState<CellState[][]>(DEFAULT_GRID);
  const [result, setResult] = useState<AlgorithmResult>(() => generateSteps(DEFAULT_GRID));
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(800);

  useEffect(() => {
    const newResult = generateSteps(grid);
    setResult(newResult);
    setCurrentStep(0);
    setIsPlaying(false);
  }, [grid]);

  const currentState = result.steps[currentStep] || result.steps[0];
  const handleNext = useCallback(() => {
    setCurrentStep(s => Math.min(s + 1, result.steps.length - 1));
  }, [result.steps.length]);

  const handlePrev = useCallback(() => {
    setCurrentStep(s => Math.max(s - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
  }, []);

  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleStepChange = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  return (
    <div style={{
      height: '100vh',
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr auto',
      gap: '10px',
      padding: '10px',
      background: '#1a1a2e',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Header githubUrl={GITHUB_URL} />

      {/* Input Panel - 放在顶部 */}
      <InputPanel onGridChange={setGrid} />

      {/* Main Content */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        gap: '10px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
        {/* Left: Code Panel */}
        <div style={{ overflow: 'auto', minHeight: 0 }}>
          <CodePanel 
            highlightedLines={currentState.highlightedLines} 
            variables={currentState.variables}
          />
        </div>

        {/* Center: Grid Visualizer */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center',
          background: '#111827',
          borderRadius: '8px',
          padding: '16px',
          minHeight: 0,
        }}>
          <GridVisualizer 
            gridState={currentState} 
            cellSize={65}
            showCoordinates={true}
            showInfectionTime={true}
          />
        </div>

        {/* Right: State & Queue Panels */}
        <div style={{ 
          display: 'grid', 
          gridTemplateRows: '1fr 1fr', 
          gap: '10px',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          <div style={{ overflow: 'auto', minHeight: 0 }}>
            <StatePanel
              minute={currentState.minute}
              freshCount={currentState.freshCount}
              rottenCount={currentState.rottenCount}
              emptyCount={currentState.emptyCount}
              totalCells={currentState.totalCells}
              initialFreshCount={currentState.initialFreshCount}
              infectedThisMinute={currentState.infectedThisMinute}
              bfsWave={currentState.bfsWave}
              phase={currentState.phase}
              isComplete={currentState.phase === AlgorithmPhase.COMPLETE}
              result={result.finalMinutes}
              description={currentState.description}
            />
          </div>
          <div style={{ overflow: 'auto', minHeight: 0 }}>
            <QueuePanel 
              queue={currentState.queue}
            />
          </div>
        </div>
      </main>

      {/* Controls */}
      <Controls
        isPlaying={isPlaying}
        currentStep={currentStep}
        totalSteps={result.steps.length}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onPrev={handlePrev}
        onReset={handleReset}
        playbackSpeed={playbackSpeed}
        onSpeedChange={setPlaybackSpeed}
        onStepChange={handleStepChange}
      />

      {/* 悬浮二维码 */}
      <FloatingQRCode />
    </div>
  );
}

export default App
