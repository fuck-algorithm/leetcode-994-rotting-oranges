import { CellState, Cell, CellWithInfo, GridState, AlgorithmResult, AlgorithmPhase, VariableValue, Direction, CallStackFrame, ScopeSnapshot } from './types';

const DIRECTIONS: [number, number][] = [
  [-1, 0],  // 上
  [1, 0],   // 下
  [0, -1],  // 左
  [0, 1]    // 右
];

const DIRECTION_NAMES: Direction[] = ['up', 'down', 'left', 'right'];

// 代码行号映射 - 更精确的行号
const CODE_LINES = {
  CLASS_DEF: [1],
  METHOD_DEF: [2],
  INIT_M: [3],
  INIT_N: [4],
  INIT_QUEUE: [5],
  INIT_FRESH: [6],
  COMMENT_INIT: [8],
  FOR_R: [9],
  FOR_C: [10],
  IF_FRESH: [11],
  FRESH_INC: [12],
  ELSE_IF_ROTTEN: [13],
  QUEUE_ADD_INIT: [14],
  INIT_MINUTES: [19],
  INIT_DIRS: [20],
  COMMENT_BFS: [22],
  WHILE_LOOP: [23],
  GET_SIZE: [24],
  FOR_I: [25],
  POLL: [26],
  GET_RC: [27],
  COMMENT_CHECK: [29],
  FOR_DIR: [30],
  CALC_NR: [31],
  CALC_NC: [32],
  IF_BOUNDS: [34, 35],
  SET_ROTTEN: [36],
  FRESH_DEC: [37],
  QUEUE_ADD: [38],
  MINUTES_INC: [42],
  RETURN: [45],
};

// 变量行号映射
const VARIABLE_LINE_MAP: Record<string, number> = {
  M: 3,
  N: 4,
  queueSize: 5,
  fresh: 6,
  r: 9,
  c: 10,
  minutes: 19,
  size: 24,
  i: 25,
  cell: 26,
  currentR: 27,
  currentC: 27,
  dir: 30,
  nr: 31,
  nc: 32,
};

function cloneGrid(grid: CellState[][]): CellState[][] {
  return grid.map(row => [...row]);
}

function cloneCellInfoGrid(grid: CellWithInfo[][]): CellWithInfo[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

function countOranges(grid: CellState[][]): { fresh: number; rotten: number; empty: number } {
  let fresh = 0, rotten = 0, empty = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === CellState.FRESH) fresh++;
      else if (cell === CellState.ROTTEN) rotten++;
      else empty++;
    }
  }
  return { fresh, rotten, empty };
}

function createCellInfoGrid(grid: CellState[][]): CellWithInfo[][] {
  return grid.map((row, r) => 
    row.map((state, c) => ({
      row: r,
      col: c,
      state,
      infectionTime: state === CellState.ROTTEN ? 0 : undefined,
    }))
  );
}

function createVariables(values: Record<string, string | number | undefined>): VariableValue[] {
  const result: VariableValue[] = [];
  for (const [name, value] of Object.entries(values)) {
    if (value !== undefined && name in VARIABLE_LINE_MAP) {
      result.push({
        name,
        value: String(value),
        line: VARIABLE_LINE_MAP[name],
      });
    }
  }
  return result;
}

export function getAdjacentFresh(grid: CellState[][], row: number, col: number): Cell[] {
  const result: Cell[] = [];
  const M = grid.length, N = grid[0].length;
  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr, nc = col + dc;
    if (nr >= 0 && nr < M && nc >= 0 && nc < N && grid[nr][nc] === CellState.FRESH) {
      result.push({ row: nr, col: nc });
    }
  }
  return result;
}


function buildCallStack(frames: { id: string; label: string; line: number; variables: VariableValue[] }[]): CallStackFrame[] {
  return frames.map((f, i) => ({ ...f, depth: i }));
}

function buildScope(members: VariableValue[], locals: VariableValue[]): ScopeSnapshot {
  return { members, locals };
}

function createStep(
  grid: CellState[][],
  cellInfoGrid: CellWithInfo[][],
  minute: number,
  fresh: number,
  rotten: number,
  empty: number,
  totalCells: number,
  initialFresh: number,
  infectedThisMinute: number,
  bfsWave: number,
  newlyRotten: Cell[],
  queue: Cell[],
  highlightedLines: number[],
  phase: AlgorithmPhase,
  description: string,
  variables: VariableValue[],
  callStack: CallStackFrame[],
  scope: ScopeSnapshot,
  currentCell?: Cell,
  checkingDirection?: Direction,
  waveColor?: string,
  targetCell?: Cell,
  pendingInfect?: Cell[]
): GridState {
  return {
    grid: cloneGrid(grid),
    cellInfoGrid: cloneCellInfoGrid(cellInfoGrid),
    minute,
    freshCount: fresh,
    rottenCount: rotten,
    emptyCount: empty,
    totalCells,
    initialFreshCount: initialFresh,
    infectedThisMinute,
    bfsWave,
    newlyRotten: [...newlyRotten],
    queue: [...queue],
    highlightedLines,
    phase,
    description,
    variables,
    callStack,
    scope,
    currentCell,
    checkingDirection,
    waveColor,
    targetCell,
    pendingInfect: pendingInfect ? pendingInfect.map(c => ({ ...c })) : undefined,
  };
}

// BFS 波次色相表：按分钟循环取色，让每分钟的扩散波有不同色环，用户可区分"第1波/第2波..."
const WAVE_COLORS = [
  '#fbbf24', // 黄
  '#60a5fa', // 蓝
  '#a78bfa', // 紫
  '#34d399', // 绿
  '#f472b6', // 粉
  '#fb7185', // 红
];

/** 给定分钟数返回该波次的色相（循环复用） */
function getWaveColor(minute: number): string {
  return WAVE_COLORS[minute % WAVE_COLORS.length];
}

/** 格式化单元格坐标为 [r,c] 字符串，用于叙事 description */
function formatCell(cell: Cell): string {
  return `[${cell.row},${cell.col}]`;
}

export function generateSteps(initialGrid: CellState[][]): AlgorithmResult {
  const steps: GridState[] = [];
  const grid = cloneGrid(initialGrid);
  const M = grid.length, N = grid[0].length;
  const totalCells = M * N;
  const queue: Cell[] = [];
  const { fresh: initialFresh, rotten, empty } = countOranges(grid);
  let fresh = initialFresh;
  let currentRotten = rotten;
  const cellInfoGrid = createCellInfoGrid(grid);

  // ========== 第一阶段：初始化（合并为 3 个关键 step） ==========

  // Step 1: 进入方法并初始化所有局部变量（合并原 5 个逐行 step）
  {
    const variables = createVariables({ M, N, queueSize: 0, fresh });
    const members = createVariables({ M, N, queueSize: 0, fresh });
    steps.push(createStep(
      grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [], CODE_LINES.METHOD_DEF, AlgorithmPhase.INIT,
      `进入 orangesRotting 方法。网格 ${M}×${N}，共 ${totalCells} 格。初始化：M=${M}、N=${N}、空队列 queue、新鲜计数 fresh、方向数组 dirs（上下左右）`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
      ]),
      buildScope(members, variables)
    ));
  }

  // Step 2: 遍历整个网格，统计新鲜橘子 + 腐烂橘子入队（合并原逐格 ~100 step）
  {
    // 实际遍历计算 fresh 与 queue（与原逻辑一致，只是不再为每格推 step）
    let tempFresh = 0;
    const tempQueue: Cell[] = [];
    for (let r = 0; r < M; r++) {
      for (let c = 0; c < N; c++) {
        if (grid[r][c] === CellState.FRESH) tempFresh++;
        else if (grid[r][c] === CellState.ROTTEN) tempQueue.push({ row: r, col: c });
      }
    }
    fresh = tempFresh;
    queue.push(...tempQueue);

    const variables = createVariables({ M, N, queueSize: queue.length, fresh });
    const members = createVariables({ M, N, queueSize: queue.length, fresh });
    steps.push(createStep(
      grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [...queue], CODE_LINES.INIT_MINUTES, AlgorithmPhase.INIT,
      `遍历网格完成：发现 ${fresh} 个新鲜橘子、${queue.length} 个腐烂橘子。腐烂橘子坐标已全部入队（黄色高亮 = 队首），fresh=${fresh}。接下来开始 BFS 逐分钟扩散`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'init-loop', label: `遍历网格统计入队`, line: CODE_LINES.FOR_R[0], variables: createVariables({ M, N, fresh }) },
      ]),
      buildScope(members, variables)
    ));
  }

  // Step 3: 初始化 BFS 所需变量并就绪（合并原 minutes/dirs 注释 step）
  {
    const variables = createVariables({ M, N, queueSize: queue.length, fresh, minutes: 0 });
    const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: 0 });
    steps.push(createStep(
      grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [...queue], CODE_LINES.INIT_DIRS, AlgorithmPhase.INIT,
      `初始化计时器 minutes=0、方向数组 dirs={{-1,0},{1,0},{0,-1},{0,1}}（上下左右）。准备就绪，开始 BFS 主循环`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
      ]),
      buildScope(members, variables)
    ));
  }

  // 提前返回情况保留（无新鲜橘子 / 无腐烂橘子但有新鲜橘子）
  if (fresh === 0) {
    const variables = createVariables({ fresh: 0, minutes: 0 });
    const members = createVariables({ M, N, queueSize: queue.length, fresh: 0, minutes: 0 });
    steps.push(createStep(
      grid, cellInfoGrid, 0, 0, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [...queue], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
      `没有新鲜橘子需要感染，直接返回 0`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'return', label: `return 0`, line: CODE_LINES.RETURN[0], variables: createVariables({ minutes: 0 }) },
      ]),
      buildScope(members, variables)
    ));
    return { steps, finalMinutes: 0, success: true };
  }

  // 如果没有腐烂橘子但有新鲜橘子
  if (queue.length === 0 && fresh > 0) {
    const variables = createVariables({ fresh, minutes: 0 });
    const members = createVariables({ M, N, queueSize: 0, fresh, minutes: 0 });
    steps.push(createStep(
      grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
      `没有腐烂橘子，但有 ${fresh} 个新鲜橘子无法被感染，返回 -1`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'return', label: `return ${-1}`, line: CODE_LINES.RETURN[0], variables: createVariables({ minutes: 0 }) },
      ]),
      buildScope(members, variables)
    ));
    return { steps, finalMinutes: -1, success: false };
  }


  // ========== 第三阶段：BFS 主循环（逐分钟粒度：每波 1-2 个 step，整波同时扩散） ==========

  let minute = 0;

  // Step: 进入 BFS
  {
    const waveColor = getWaveColor(minute);
    const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute });
    const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.COMMENT_BFS, AlgorithmPhase.BFS_LOOP,
      `开始 BFS 广度优先搜索。原理：每"分钟"，队列里所有腐烂橘子同时向四个方向扩散，感染相邻的新鲜橘子。同色环 = 同一波（同一分钟）被感染。第 0 分钟色环=${waveColor}`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
      ]),
      buildScope(members, variables),
      undefined, undefined, waveColor
    ));
  }

  while (queue.length > 0 && fresh > 0) {
    const size = queue.length;
    const waveColor = getWaveColor(minute);
    // 这一分钟开始时，队列里前 size 个就是本轮的源橘子
    const waveSources: Cell[] = queue.slice(0, size);

    // Step 1: 第 minute 分钟开始 —— 展示这一波的源橘子（蓝色高亮第一个）
    {
      const firstSource = waveSources[0];
      const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute, size });
      const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        0, minute, [], [...queue], CODE_LINES.GET_SIZE, AlgorithmPhase.BFS_LOOP,
        `第 ${minute} 分钟开始：队列里有 ${size} 个腐烂橘子（${waveColor} 色环）将同时向四周扩散感染。它们是：${waveSources.map(c => `[${c.row},${c.col}]`).join(' ')}。剩余新鲜橘子 ${fresh}`,
        variables,
        buildCallStack([
          { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
          { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length, size }) },
          { id: 'iterate-cell', label: `本波 ${size} 个源橘子`, line: CODE_LINES.FOR_I[0], variables: createVariables({ size }) },
        ]),
        buildScope(members, variables),
        firstSource, undefined, waveColor
      ));
    }

    // 一次性处理这一波所有源橘子的所有方向 —— 收集全部感染（模拟"同时扩散"）
    const newlyRotten: Cell[] = [];
    const infectionPairs: { from: Cell; to: Cell; dir: Direction }[] = [];
    // 先记录本轮要处理的源橘子，再逐个出队（与原算法 queue 语义一致）
    for (let i = 0; i < size; i++) {
      const cell = queue.shift()!;
      for (let d = 0; d < DIRECTIONS.length; d++) {
        const [dr, dc] = DIRECTIONS[d];
        const dirName = DIRECTION_NAMES[d];
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        const inBounds = nr >= 0 && nr < M && nc >= 0 && nc < N;
        // 关键：只感染"此刻仍是新鲜"的格子（避免同波内重复感染，模拟同时扩散）
        if (inBounds && grid[nr][nc] === CellState.FRESH) {
          grid[nr][nc] = CellState.ROTTEN;
          cellInfoGrid[nr][nc].state = CellState.ROTTEN;
          cellInfoGrid[nr][nc].infectionTime = minute + 1;
          fresh--;
          currentRotten++;
          queue.push({ row: nr, col: nc });
          newlyRotten.push({ row: nr, col: nc });
          infectionPairs.push({ from: cell, to: { row: nr, col: nc }, dir: dirName });
        }
      }
    }

    // Step 2: 第 minute 分钟扩散完成 —— 整波感染同时呈现在画布上
    if (newlyRotten.length > 0) {
      const lastInfected = newlyRotten[newlyRotten.length - 1];
      const lastFrom = infectionPairs[infectionPairs.length - 1].from;
      const dirChinese = infectionPairs[infectionPairs.length - 1].dir === 'up' ? '上'
        : infectionPairs[infectionPairs.length - 1].dir === 'down' ? '下'
        : infectionPairs[infectionPairs.length - 1].dir === 'left' ? '左' : '右';
      minute++;
      const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute, size });
      const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        newlyRotten.length, minute - 1, [...newlyRotten], [...queue], CODE_LINES.SET_ROTTEN, AlgorithmPhase.INFECT,
        `第 ${minute - 1} 分钟扩散完成：${size} 个源橘子同时感染了 ${newlyRotten.length} 个新鲜橘子，全部变褐（${waveColor} 色环）。例如 ${formatCell(lastFrom)} →${dirChinese}→ 感染 ${formatCell(lastInfected)}。minutes=${minute}，剩余新鲜 ${fresh}${fresh === 0 ? '，全部感染完成！' : ''}`,
        variables,
        buildCallStack([
          { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
          { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
          { id: 'infect', label: `本波感染 ${newlyRotten.length} 个`, line: CODE_LINES.SET_ROTTEN[0], variables: createVariables({ fresh }) },
        ]),
        buildScope(members, variables),
        lastFrom, infectionPairs[infectionPairs.length - 1].dir, waveColor, lastInfected,
        [...newlyRotten]
      ));
    } else {
      // 这一波没有任何感染（所有源橘子相邻格子都已腐烂/空）—— 队列会自然耗尽，循环将退出
      // 不推额外 step，避免零视觉变化
    }
  }

  // ========== 第四阶段：返回结果 ==========

  // Step: while 条件不满足
  if (queue.length === 0 || fresh === 0) {
    const reason = fresh === 0
      ? `所有新鲜橘子都已被感染（fresh=0）`
      : `队列为空，没有更多腐烂橘子可以传播，但仍有 ${fresh} 个新鲜橘子被空格隔离`;
    const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute });
    const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.WHILE_LOOP, AlgorithmPhase.BFS_LOOP,
      `while 条件不再满足：${reason}，退出 BFS 循环`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
      ]),
      buildScope(members, variables)
    ));
  }

  // Step: 返回结果
  {
    const success = fresh === 0;
    const variables = createVariables({ fresh, minutes: minute });
    const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
      success
        ? `✅ 完成！所有橘子在 ${minute} 分钟内全部腐烂，return ${minute}`
        : `❌ 完成！仍有 ${fresh} 个橘子被空格隔离无法感染，return -1`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'return', label: `return ${success ? minute : -1}`, line: CODE_LINES.RETURN[0], variables: createVariables({ minutes: minute }) },
      ]),
      buildScope(members, variables)
    ));

    return { steps, finalMinutes: success ? minute : -1, success };
  }
}
