import { CellState, Cell, CellWithInfo, GridState, AlgorithmResult, AlgorithmPhase, VariableValue, Direction } from './types';

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
  currentCell?: Cell,
  checkingDirection?: Direction
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
    currentCell,
    checkingDirection,
  };
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


  // ========== 第一阶段：初始化 ==========
  
  // Step: 定义类和方法
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.METHOD_DEF, AlgorithmPhase.INIT,
    '开始执行 orangesRotting 方法，传入二维网格 grid',
    createVariables({ M, N })
  ));

  // Step: 初始化 M
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.INIT_M, AlgorithmPhase.INIT,
    `初始化 M = grid.length = ${M}（网格行数）`,
    createVariables({ M })
  ));

  // Step: 初始化 N
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.INIT_N, AlgorithmPhase.INIT,
    `初始化 N = grid[0].length = ${N}（网格列数）`,
    createVariables({ M, N })
  ));

  // Step: 初始化队列
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.INIT_QUEUE, AlgorithmPhase.INIT,
    '创建空的 BFS 队列 queue，用于存储腐烂橘子的坐标',
    createVariables({ M, N, queueSize: 0 })
  ));

  // Step: 初始化 fresh 计数器
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.INIT_FRESH, AlgorithmPhase.INIT,
    '初始化 fresh = 0，用于统计新鲜橘子数量',
    createVariables({ M, N, queueSize: 0, fresh: 0 })
  ));


  // ========== 第二阶段：遍历网格 ==========
  
  // Step: 开始遍历注释
  steps.push(createStep(
    grid, cellInfoGrid, 0, 0, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.COMMENT_INIT, AlgorithmPhase.INIT,
    '开始遍历网格：统计新鲜橘子数量，将腐烂橘子坐标加入队列',
    createVariables({ M, N, queueSize: 0, fresh: 0 })
  ));

  // 详细遍历每个单元格
  let tempFresh = 0;
  const tempQueue: Cell[] = [];
  
  for (let r = 0; r < M; r++) {
    // Step: 外层循环开始
    steps.push(createStep(
      grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [...tempQueue], CODE_LINES.FOR_R, AlgorithmPhase.INIT,
      `外层循环：r = ${r}，遍历第 ${r} 行`,
      createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r })
    ));

    for (let c = 0; c < N; c++) {
      // Step: 内层循环开始
      steps.push(createStep(
        grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
        0, 0, [], [...tempQueue], CODE_LINES.FOR_C, AlgorithmPhase.INIT,
        `内层循环：c = ${c}，检查单元格 [${r},${c}]`,
        createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r, c }),
        { row: r, col: c }
      ));

      const cellValue = grid[r][c];
      
      if (cellValue === CellState.FRESH) {
        // Step: 发现新鲜橘子
        steps.push(createStep(
          grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
          0, 0, [], [...tempQueue], CODE_LINES.IF_FRESH, AlgorithmPhase.INIT,
          `单元格 [${r},${c}] 的值为 1（新鲜橘子）`,
          createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r, c }),
          { row: r, col: c }
        ));
        
        tempFresh++;
        
        // Step: fresh++
        steps.push(createStep(
          grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
          0, 0, [], [...tempQueue], CODE_LINES.FRESH_INC, AlgorithmPhase.INIT,
          `fresh++，新鲜橘子计数增加到 ${tempFresh}`,
          createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r, c }),
          { row: r, col: c }
        ));
      } else if (cellValue === CellState.ROTTEN) {
        // Step: 发现腐烂橘子
        steps.push(createStep(
          grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
          0, 0, [], [...tempQueue], CODE_LINES.ELSE_IF_ROTTEN, AlgorithmPhase.INIT,
          `单元格 [${r},${c}] 的值为 2（腐烂橘子）`,
          createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r, c }),
          { row: r, col: c }
        ));
        
        tempQueue.push({ row: r, col: c });
        
        // Step: 入队
        steps.push(createStep(
          grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
          0, 0, [], [...tempQueue], CODE_LINES.QUEUE_ADD_INIT, AlgorithmPhase.INIT,
          `将腐烂橘子坐标 [${r},${c}] 加入队列，队列长度变为 ${tempQueue.length}`,
          createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r, c }),
          { row: r, col: c }
        ));
      } else {
        // Step: 空单元格
        steps.push(createStep(
          grid, cellInfoGrid, 0, tempFresh, currentRotten, empty, totalCells, initialFresh,
          0, 0, [], [...tempQueue], CODE_LINES.FOR_C, AlgorithmPhase.INIT,
          `单元格 [${r},${c}] 的值为 0（空），跳过`,
          createVariables({ M, N, queueSize: tempQueue.length, fresh: tempFresh, r, c }),
          { row: r, col: c }
        ));
      }
    }
  }

  // 更新队列
  queue.push(...tempQueue);
  fresh = tempFresh;


  // Step: 遍历完成总结
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [...queue], CODE_LINES.INIT_MINUTES, AlgorithmPhase.INIT,
    `网格遍历完成：发现 ${fresh} 个新鲜橘子，${queue.length} 个腐烂橘子已入队`,
    createVariables({ M, N, queueSize: queue.length, fresh })
  ));

  // Step: 初始化 minutes
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [...queue], CODE_LINES.INIT_MINUTES, AlgorithmPhase.INIT,
    '初始化 minutes = 0，用于记录经过的分钟数',
    createVariables({ M, N, queueSize: queue.length, fresh, minutes: 0 })
  ));

  // Step: 初始化方向数组
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [...queue], CODE_LINES.INIT_DIRS, AlgorithmPhase.INIT,
    '初始化方向数组 dirs = {{-1,0},{1,0},{0,-1},{0,1}}，表示上、下、左、右四个方向',
    createVariables({ M, N, queueSize: queue.length, fresh, minutes: 0 })
  ));

  // 如果没有新鲜橘子，直接返回 0
  if (fresh === 0) {
    steps.push(createStep(
      grid, cellInfoGrid, 0, 0, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [...queue], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
      '没有新鲜橘子需要感染，直接返回 0',
      createVariables({ fresh: 0, minutes: 0 })
    ));
    return { steps, finalMinutes: 0, success: true };
  }

  // 如果没有腐烂橘子但有新鲜橘子
  if (queue.length === 0 && fresh > 0) {
    steps.push(createStep(
      grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
      `没有腐烂橘子，但有 ${fresh} 个新鲜橘子无法被感染，返回 -1`,
      createVariables({ fresh, minutes: 0 })
    ));
    return { steps, finalMinutes: -1, success: false };
  }


  // ========== 第三阶段：BFS 主循环 ==========
  
  let minute = 0;

  // Step: BFS 注释
  steps.push(createStep(
    grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
    0, minute, [], [...queue], CODE_LINES.COMMENT_BFS, AlgorithmPhase.BFS_LOOP,
    '开始 BFS 广度优先搜索主循环',
    createVariables({ fresh, queueSize: queue.length, minutes: minute })
  ));

  while (queue.length > 0 && fresh > 0) {
    // Step: while 条件检查
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.WHILE_LOOP, AlgorithmPhase.BFS_LOOP,
      `检查 while 条件：队列不为空(${queue.length} > 0) 且 还有新鲜橘子(${fresh} > 0)，条件成立，进入循环`,
      createVariables({ fresh, queueSize: queue.length, minutes: minute })
    ));

    const size = queue.length;
    
    // Step: 获取当前层大小
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.GET_SIZE, AlgorithmPhase.BFS_LOOP,
      `获取当前层大小 size = ${size}，这一分钟需要处理 ${size} 个腐烂橘子`,
      createVariables({ fresh, queueSize: queue.length, minutes: minute, size })
    ));

    const newlyRotten: Cell[] = [];

    // 处理当前层的每个腐烂橘子
    for (let i = 0; i < size; i++) {
      // Step: for 循环
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        0, minute, [...newlyRotten], [...queue], CODE_LINES.FOR_I, AlgorithmPhase.BFS_LOOP,
        `处理第 ${i + 1}/${size} 个腐烂橘子`,
        createVariables({ fresh, queueSize: queue.length, minutes: minute, size, i })
      ));

      const cell = queue.shift()!;
      
      // Step: 出队
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        0, minute, [...newlyRotten], [...queue], CODE_LINES.POLL, AlgorithmPhase.BFS_LOOP,
        `从队列中取出腐烂橘子 [${cell.row},${cell.col}]`,
        createVariables({ fresh, queueSize: queue.length, minutes: minute, size, i }),
        cell
      ));

      // Step: 获取坐标
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        0, minute, [...newlyRotten], [...queue], CODE_LINES.GET_RC, AlgorithmPhase.BFS_LOOP,
        `获取坐标 r = ${cell.row}, c = ${cell.col}`,
        createVariables({ fresh, queueSize: queue.length, minutes: minute, currentR: cell.row, currentC: cell.col }),
        cell
      ));


      // Step: 检查方向注释
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        0, minute, [...newlyRotten], [...queue], CODE_LINES.COMMENT_CHECK, AlgorithmPhase.CHECK_ADJACENT,
        `开始检查 [${cell.row},${cell.col}] 的四个相邻方向`,
        createVariables({ fresh, queueSize: queue.length, minutes: minute, currentR: cell.row, currentC: cell.col }),
        cell
      ));

      // 检查四个方向
      for (let d = 0; d < DIRECTIONS.length; d++) {
        const [dr, dc] = DIRECTIONS[d];
        const dirName = DIRECTION_NAMES[d];
        const dirChinese = dirName === 'up' ? '上' : dirName === 'down' ? '下' : dirName === 'left' ? '左' : '右';
        
        // Step: 遍历方向
        steps.push(createStep(
          grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
          0, minute, [...newlyRotten], [...queue], CODE_LINES.FOR_DIR, AlgorithmPhase.CHECK_ADJACENT,
          `检查${dirChinese}方向 (dir = [${dr},${dc}])`,
          createVariables({ fresh, queueSize: queue.length, minutes: minute, currentR: cell.row, currentC: cell.col }),
          cell, dirName
        ));

        const nr = cell.row + dr;
        const nc = cell.col + dc;

        // Step: 计算 nr
        steps.push(createStep(
          grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
          0, minute, [...newlyRotten], [...queue], CODE_LINES.CALC_NR, AlgorithmPhase.CHECK_ADJACENT,
          `计算新行号 nr = ${cell.row} + (${dr}) = ${nr}`,
          createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, currentR: cell.row, currentC: cell.col }),
          cell, dirName
        ));

        // Step: 计算 nc
        steps.push(createStep(
          grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
          0, minute, [...newlyRotten], [...queue], CODE_LINES.CALC_NC, AlgorithmPhase.CHECK_ADJACENT,
          `计算新列号 nc = ${cell.col} + (${dc}) = ${nc}`,
          createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc, currentR: cell.row, currentC: cell.col }),
          cell, dirName
        ));

        // 检查边界和是否为新鲜橘子
        const inBounds = nr >= 0 && nr < M && nc >= 0 && nc < N;
        const isFresh = inBounds && grid[nr][nc] === CellState.FRESH;


        if (!inBounds) {
          // Step: 越界
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.IF_BOUNDS, AlgorithmPhase.CHECK_ADJACENT,
            `[${nr},${nc}] 越界，跳过此方向`,
            createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc }),
            cell, dirName
          ));
        } else if (!isFresh) {
          // Step: 不是新鲜橘子
          const cellType = grid[nr][nc] === CellState.ROTTEN ? '腐烂橘子' : '空单元格';
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.IF_BOUNDS, AlgorithmPhase.CHECK_ADJACENT,
            `[${nr},${nc}] 是${cellType}，不是新鲜橘子，跳过`,
            createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc }),
            cell, dirName
          ));
        } else {
          // Step: 发现新鲜橘子，准备感染
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.IF_BOUNDS, AlgorithmPhase.CHECK_ADJACENT,
            `[${nr},${nc}] 是新鲜橘子！条件满足，准备感染`,
            createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc }),
            cell, dirName
          ));

          // 感染橘子
          grid[nr][nc] = CellState.ROTTEN;
          cellInfoGrid[nr][nc].state = CellState.ROTTEN;
          cellInfoGrid[nr][nc].infectionTime = minute + 1;

          // Step: 设置为腐烂
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten + 1, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.SET_ROTTEN, AlgorithmPhase.INFECT,
            `将 [${nr},${nc}] 设置为腐烂状态 (grid[${nr}][${nc}] = 2)`,
            createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc }),
            { row: nr, col: nc }, dirName
          ));

          fresh--;
          currentRotten++;

          // Step: fresh--
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.FRESH_DEC, AlgorithmPhase.INFECT,
            `fresh--，新鲜橘子数量减少到 ${fresh}`,
            createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc }),
            { row: nr, col: nc }, dirName
          ));

          queue.push({ row: nr, col: nc });
          newlyRotten.push({ row: nr, col: nc });

          // Step: 入队
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.QUEUE_ADD, AlgorithmPhase.INFECT,
            `将新感染的橘子 [${nr},${nc}] 加入队列，队列长度变为 ${queue.length}`,
            createVariables({ fresh, queueSize: queue.length, minutes: minute, nr, nc }),
            { row: nr, col: nc }, dirName
          ));
        }
      }
    }


    // 如果这一分钟有橘子被感染
    if (newlyRotten.length > 0) {
      minute++;
      
      // Step: minutes++
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        newlyRotten.length, minute, [...newlyRotten], [...queue], CODE_LINES.MINUTES_INC, AlgorithmPhase.INFECT,
        `第 ${minute} 分钟结束：本分钟感染了 ${newlyRotten.length} 个橘子，minutes++ = ${minute}`,
        createVariables({ fresh, queueSize: queue.length, minutes: minute })
      ));
    }
  }

  // ========== 第四阶段：返回结果 ==========
  
  // Step: while 条件不满足
  if (queue.length === 0 || fresh === 0) {
    const reason = fresh === 0 
      ? '所有新鲜橘子都已被感染 (fresh = 0)' 
      : '队列为空，没有更多腐烂橘子可以传播';
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.WHILE_LOOP, AlgorithmPhase.BFS_LOOP,
      `while 条件不满足：${reason}，退出循环`,
      createVariables({ fresh, queueSize: queue.length, minutes: minute })
    ));
  }

  // Step: 返回结果
  const success = fresh === 0;
  steps.push(createStep(
    grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
    0, minute, [], [], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
    success 
      ? `✅ 算法完成！所有橘子在 ${minute} 分钟内全部腐烂，返回 ${minute}` 
      : `❌ 算法完成！仍有 ${fresh} 个橘子无法被感染（被空单元格隔离），返回 -1`,
    createVariables({ fresh, minutes: minute })
  ));

  return { steps, finalMinutes: success ? minute : -1, success };
}
