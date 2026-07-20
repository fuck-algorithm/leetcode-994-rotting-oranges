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
  // ===== 新增：可读性视觉辅助字段 =====
  /** 当前 BFS 波次（分钟数）对应的色相，用于给本轮新感染的格子加色环，让用户看清"一整波同时扩散" */
  waveColor?: string;
  /** 当前正在检查/感染的目标格子（方向箭头终点），让用户眼睛知道看哪个格子 */
  targetCell?: Cell;
  /** 即将被感染（本轮新感染）的格子坐标列表。注意：此 step 的 grid 已是 ROTTEN（感染后），
   *  本字段标记"这些格子刚从 FRESH 变来"，仅用于渲染层做 FRESH↔ROTTEN 闪烁动画，让用户意识到"这些是即将被感染的橘子" */
  pendingInfect?: Cell[];
  // ===== 新增：Debug 模式数据 =====
  /** 逻辑作用域调用栈帧（方法体 → 循环 → 迭代 → 方向检查 → 感染） */
  callStack?: CallStackFrame[];
  /** 当前作用域变量快照（成员变量 + 局部变量） */
  scope?: ScopeSnapshot;
}

/** 调用栈帧：表示当前所处的逻辑作用域层级（BFS 是循环而非递归，栈帧是概念性的逻辑作用域） */
export interface CallStackFrame {
  /** 帧标识：method | init-loop | bfs-loop | iterate-cell | check-direction | infect | return */
  id: string;
  /** 人类可读标签，如 "orangesRotting()" / "while (BFS 主循环)" / "检查方向: 右" */
  label: string;
  /** 该帧对应的代码行号（用于与 CodePanel 高亮联动） */
  line: number;
  /** 当前帧作用域内的变量快照 */
  variables: VariableValue[];
  /** 帧的层级深度（0 = 最外层方法帧） */
  depth: number;
}

/** 作用域快照：当前可见的所有变量，按类别分组 */
export interface ScopeSnapshot {
  /** 局部变量（随循环迭代变化：r, c, i, nr, nc, cell, dir 等） */
  locals: VariableValue[];
  /** 实例/方法级变量（整个方法期间存在：M, N, fresh, minutes, queue, dirs） */
  members: VariableValue[];
}

export interface AlgorithmResult {
  steps: GridState[];
  finalMinutes: number;
  success: boolean;
}
