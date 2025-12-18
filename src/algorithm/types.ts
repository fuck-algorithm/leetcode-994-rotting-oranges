export enum CellState {
  EMPTY = 0,
  FRESH = 1,
  ROTTEN = 2,
}

export interface Cell {
  row: number;
  col: number;
}

export interface CellWithInfo {
  row: number;
  col: number;
  state: CellState;
  infectionTime?: number;  // 被感染的时间（分钟数）
}

export interface VariableValue {
  name: string;
  value: string;
  line: number;
}

export enum AlgorithmPhase {
  INIT = 'init',
  BFS_LOOP = 'bfs_loop',
  CHECK_ADJACENT = 'check_adjacent',
  INFECT = 'infect',
  COMPLETE = 'complete',
}

export type Direction = 'up' | 'down' | 'left' | 'right' | null;

export interface GridState {
  grid: CellState[][];
  cellInfoGrid: CellWithInfo[][];
  minute: number;
  freshCount: number;
  rottenCount: number;
  emptyCount: number;
  totalCells: number;
  initialFreshCount: number;
  infectedThisMinute: number;
  bfsWave: number;
  newlyRotten: Cell[];
  queue: Cell[];
  highlightedLines: number[];
  phase: AlgorithmPhase;
  description: string;
  variables: VariableValue[];
  currentCell?: Cell;
  checkingDirection?: Direction;
}

export interface AlgorithmResult {
  steps: GridState[];
  finalMinutes: number;
  success: boolean;
}
