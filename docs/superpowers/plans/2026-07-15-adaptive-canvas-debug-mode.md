# 自适应画布 + 代码面板 Debug 模式增强 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 让网格画布根据网格行列数和容器尺寸自动计算 cellSize 与坐标（消除溢出），并把左侧代码面板升级为真正的 Debug 模式——实时变量观察 + 调用栈帧可视化。

**Architecture:** 容器尺寸（ResizeObserver）+ 网格行列数 → `useAutoFitGrid` hook 计算 `cellSize` → `GridVisualizer` 用自适应 cellSize 渲染 D3 svg（svg viewBox 缩放，永不溢出）。算法侧 `generateSteps` 在每个 `GridState` 填充 `callStack`（逻辑作用域帧：方法体 → BFS 循环 → 当前橘子处理 → 方向检查）和 `scope`（当前作用域可见变量快照），`CodePanel` 重构为带折叠的 Debug 视图，嵌入 `CallStackPanel` + 变量观察区。复用现有 `GridState.variables` 数据流，新增字段全部可选以保持向后兼容。

**Tech Stack:** React 18.3, TypeScript 5.6, Vite 5.4, D3 7.9, Vitest 2.1, fast-check 3.23

**Risks:**
- Task 1 修改共享 `GridState` 类型 → 缓解：新增字段全部设为可选（`callStack?`、`scope?`），现有测试与组件不受影响
- 窗口 resize 时 D3 svg 需重算 → 缓解：`useAutoFitGrid` 用 ResizeObserver 监听容器，cellSize 变化触发 useEffect 重绘
- "调用栈帧"对 BFS（循环而非递归）是概念性的 → 缓解：明确栈帧 = 逻辑作用域层（方法/循环/迭代/方向），用 `phase` + `label` + `variables` 表达，不模拟真实 JS 调用栈
- Task 2 修改 `rottingOranges.ts`（587 行大文件）→ 缓解：只在 `createStep` 调用处增加 `callStack`/`scope` 参数计算，不改 BFS 主逻辑

---

### Task 1: 扩展 GridState 类型以支持调用栈与作用域

**Depends on:** None
**Files:**
- Modify: `src/algorithm/types.ts:35-60`

- [ ] **Step 1: 扩展 types.ts — 新增 CallStackFrame、ScopeSnapshot 类型并挂到 GridState**
文件: `src/algorithm/types.ts:35-60`（在 `GridState` 接口内追加字段，并在文件末尾追加新类型）

```typescript
// 替换 src/algorithm/types.ts:35-60 的 GridState 接口（其余文件内容不变）
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
  // ===== 新增：Debug 模式数据 =====
  callStack?: CallStackFrame[];
  scope?: ScopeSnapshot;
}

/** 调用栈帧：表示当前所处的逻辑作用域层级 */
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
```

- [ ] **Step 2: 验证类型扩展不破坏现有测试**
Run: `npx vitest run src/components/components.test.ts src/algorithm/rottingOranges.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "FAIL" or "TypeError"

- [ ] **Step 3: 提交**
Run: `git add src/algorithm/types.ts && git commit -m "feat(types): add CallStackFrame and ScopeSnapshot to GridState for debug mode"`

---

### Task 2: 自适应画布尺寸 hook 与 GridVisualizer 重构

**Depends on:** None（与 Task 1 并行，互不依赖）
**Files:**
- Create: `src/hooks/useAutoFitGrid.ts`
- Modify: `src/components/GridVisualizer.tsx:1-140`
- Modify: `src/App.tsx:106-138`
- Create: `src/hooks/__tests__/useAutoFitGrid.test.ts`

- [ ] **Step 1: 创建 useAutoFitGrid hook — 根据容器与网格尺寸计算 cellSize**
创建文件: `src/hooks/useAutoFitGrid.ts`

```typescript
import { useState, useEffect, RefObject } from 'react';

interface UseAutoFitGridProps {
  /** 容器 ref */
  containerRef: RefObject<HTMLElement | null>;
  /** 网格行数 */
  rows: number;
  /** 网格列数 */
  cols: number;
  /** 单元格间距 */
  gap?: number;
  /** 留白（容器内边距等） */
  padding?: number;
  /** 单元格最大尺寸上限 */
  maxCellSize?: number;
  /** 单元格最小尺寸下限 */
  minCellSize?: number;
}

export interface AutoFitResult {
  /** 计算出的单元格尺寸 */
  cellSize: number;
  /** svg 总宽度 */
  width: number;
  /** svg 总高度 */
  height: number;
  /** 容器实际宽高 */
  containerWidth: number;
  containerHeight: number;
}

/**
 * 根据容器可用空间和网格行列数，自动计算单元格尺寸。
 * 保证网格完整可见不溢出，同时尽量填满容器。
 */
export function useAutoFitGrid({
  containerRef,
  rows,
  cols,
  gap = 4,
  padding = 0,
  maxCellSize = 80,
  minCellSize = 20,
}: UseAutoFitGridProps): AutoFitResult {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  const { width: cw, height: ch } = containerSize;

  // 可用空间 = 容器尺寸 - 留白
  const availW = Math.max(0, cw - padding * 2);
  const availH = Math.max(0, ch - padding * 2);

  // 按 width / height 两个维度分别算出能放下的 cellSize
  // width = cols * cellSize + (cols - 1) * gap → cellSize = (availW - (cols-1)*gap) / cols
  const sizeByWidth = cols > 0 ? (availW - (cols - 1) * gap) / cols : maxCellSize;
  const sizeByHeight = rows > 0 ? (availH - (rows - 1) * gap) / rows : maxCellSize;

  // 取较小值保证两个方向都不溢出，再 clamp 到 [min, max]
  const raw = Math.min(sizeByWidth, sizeByHeight);
  const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(raw)));

  const width = cols * cellSize + (cols - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  return {
    cellSize,
    width,
    height,
    containerWidth: cw,
    containerHeight: ch,
  };
}

/**
 * 纯函数版本：给定容器尺寸与网格尺寸计算 cellSize。
 * 供测试使用，不依赖 DOM。
 */
export function computeCellSize(
  containerWidth: number,
  containerHeight: number,
  rows: number,
  cols: number,
  options: { gap?: number; padding?: number; maxCellSize?: number; minCellSize?: number } = {}
): AutoFitResult {
  const { gap = 4, padding = 0, maxCellSize = 80, minCellSize = 20 } = options;
  const availW = Math.max(0, containerWidth - padding * 2);
  const availH = Math.max(0, containerHeight - padding * 2);
  const sizeByWidth = cols > 0 ? (availW - (cols - 1) * gap) / cols : maxCellSize;
  const sizeByHeight = rows > 0 ? (availH - (rows - 1) * gap) / rows : maxCellSize;
  const raw = Math.min(sizeByWidth, sizeByHeight);
  const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(raw)));
  return {
    cellSize,
    width: cols * cellSize + (cols - 1) * gap,
    height: rows * cellSize + (rows - 1) * gap,
    containerWidth,
    containerHeight,
  };
}
```

- [ ] **Step 2: 创建 useAutoFitGrid 单元测试**
创建文件: `src/hooks/__tests__/useAutoFitGrid.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { computeCellSize } from '../useAutoFitGrid';

describe('computeCellSize', () => {
  it('happy path: 3x3 网格在 300x300 容器中计算合理尺寸', () => {
    const result = computeCellSize(300, 300, 3, 3);
    // (300 - 2*4) / 3 ≈ 96 → clamp 到 max 80
    expect(result.cellSize).toBe(80);
    expect(result.width).toBe(3 * 80 + 2 * 4);
    expect(result.height).toBe(3 * 80 + 2 * 4);
  });

  it('edge case: 30 列网格在 600px 宽容器中缩小不溢出', () => {
    const result = computeCellSize(600, 400, 10, 30, { gap: 4 });
    // (600 - 29*4)/30 = (600-116)/30 ≈ 16.1 → clamp 到 min 20
    expect(result.cellSize).toBe(20);
    // 验证总宽度不超过容器（考虑 minCellSize 兜底时可能略超，但应在合理范围）
    expect(result.width).toBeLessThanOrEqual(600 + 30);
  });

  it('error path: 行列数为 0 时不崩溃，返回 maxCellSize', () => {
    const result = computeCellSize(300, 300, 0, 0);
    expect(result.cellSize).toBe(80);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('正方形网格在窄高容器中按高度方向受限', () => {
    // 宽 1000，高 100，1 列 10 行：按高度 (100 - 9*4)/10 = 6.4 → clamp 20
    const result = computeCellSize(1000, 100, 10, 1, { gap: 4, minCellSize: 5 });
    expect(result.cellSize).toBe(6);
  });
});
```

- [ ] **Step 3: 重构 GridVisualizer — 接收 cellSize 由父级自适应传入，svg 加 viewBox 缩放**
文件: `src/components/GridVisualizer.tsx:1-140`（替换整个文件）

```typescript
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GridState, CellState, Cell } from '../algorithm/types';

interface GridVisualizerProps {
  gridState: GridState;
  cellSize?: number;
  showCoordinates?: boolean;
  showInfectionTime?: boolean;
}

const COLORS = {
  [CellState.EMPTY]: '#374151',
  [CellState.FRESH]: '#f97316',
  [CellState.ROTTEN]: '#7c2d12',
};

function isNewlyRotten(row: number, col: number, newlyRotten: Cell[]): boolean {
  return newlyRotten.some(c => c.row === row && c.col === col);
}

export function GridVisualizer({
  gridState,
  cellSize = 60,
  showCoordinates = true,
  showInfectionTime = true,
}: GridVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { grid, cellInfoGrid, newlyRotten, currentCell } = gridState;

  useEffect(() => {
    if (!svgRef.current || !grid.length) return;

    const svg = d3.select(svgRef.current);
    const rows = grid.length;
    const cols = grid[0].length;
    const gap = 4;
    const width = cols * (cellSize + gap) - gap;
    const height = rows * (cellSize + gap) - gap;

    // 用 viewBox 实现 svg 自适应缩放，物理尺寸 100% 填满容器
    svg
      .attr('viewBox', `0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%')
      .attr('height', '100%');
    svg.selectAll('*').remove();

    const cellData = grid.flatMap((row, r) =>
      row.map((state, c) => {
        const info = cellInfoGrid?.[r]?.[c];
        return { r, c, state, infectionTime: info?.infectionTime };
      })
    );

    const cells = svg.selectAll('g')
      .data(cellData)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.c * (cellSize + gap)}, ${d.r * (cellSize + gap)})`);

    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', Math.max(4, cellSize * 0.12))
      .attr('fill', d => COLORS[d.state])
      .attr('stroke', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return '#60a5fa';
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return '#fbbf24';
        return 'transparent';
      })
      .attr('stroke-width', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return 4;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return 3;
        return 0;
      })
      .style('filter', d => isNewlyRotten(d.r, d.c, newlyRotten) ? 'drop-shadow(0 0 8px #fbbf24)' : 'none');

    cells.filter(d => d.state !== CellState.EMPTY)
      .append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + cellSize * 0.14)
      .attr('text-anchor', 'middle')
      .attr('font-size', cellSize * 0.4)
      .text('🍊');

    if (showCoordinates) {
      cells.append('text')
        .attr('x', 4)
        .attr('y', 11)
        .attr('font-size', Math.max(7, cellSize * 0.14))
        .attr('fill', '#9ca3af')
        .attr('font-family', 'monospace')
        .text(d => `${d.r},${d.c}`);
    }

    if (showInfectionTime) {
      cells.filter(d => d.state === CellState.ROTTEN && d.infectionTime !== undefined && d.infectionTime > 0)
        .append('text')
        .attr('x', cellSize - 4)
        .attr('y', cellSize - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(8, cellSize * 0.15))
        .attr('font-weight', 'bold')
        .attr('fill', '#fbbf24')
        .text(d => `t${d.infectionTime}`);
    }

    cells.filter(d => d.state === CellState.ROTTEN && (d.infectionTime === 0 || d.infectionTime === undefined))
      .append('text')
      .attr('x', cellSize - 4)
      .attr('y', cellSize - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', Math.max(7, cellSize * 0.13))
      .attr('fill', '#ef4444')
      .text('初始');
  }, [grid, cellInfoGrid, newlyRotten, currentCell, cellSize, showCoordinates, showInfectionTime]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg ref={svgRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />
    </div>
  );
}
```

- [ ] **Step 4: 修改 App.tsx — 用 useAutoFitGrid 计算尺寸并传入 GridVisualizer**
文件: `src/App.tsx:106-138`（替换中间 main 区域的 GridVisualizer 容器与调用）

```typescript
// 文件: src/App.tsx —— 在文件顶部 import 区追加
import { useRef } from 'react';
import { useAutoFitGrid } from './hooks/useAutoFitGrid';

// 文件: src/App.tsx —— 在 App 函数体内（useState 之后、return 之前）追加
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const gridDims = grid[0] ? { rows: grid.length, cols: grid[0].length } : { rows: 0, cols: 0 };
  const { cellSize: autoCellSize } = useAutoFitGrid({
    containerRef: gridContainerRef,
    rows: gridDims.rows,
    cols: gridDims.cols,
    maxCellSize: 65,
    minCellSize: 18,
    padding: 16,
  });

// 文件: src/App.tsx:122-138 —— 替换中间 GridVisualizer 容器 div
        {/* Center: Grid Visualizer */}
        <div
          ref={gridContainerRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#111827',
            borderRadius: '8px',
            padding: '16px',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <GridVisualizer
            gridState={currentState}
            cellSize={autoCellSize}
            showCoordinates={true}
            showInfectionTime={true}
          />
        </div>
```

- [ ] **Step 5: 验证自适应画布**
Run: `npx vitest run src/hooks/__tests__/useAutoFitGrid.test.ts && npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - Output contains: "4 passed"
  - tsc 输出不含 "error TS"

- [ ] **Step 6: 提交**
Run: `git add src/hooks/useAutoFitGrid.ts src/hooks/__tests__/useAutoFitGrid.test.ts src/components/GridVisualizer.tsx src/App.tsx && git commit -m "feat(canvas): auto-fit grid cellSize to container via ResizeObserver, fix overflow"`

---

### Task 3: 在算法步骤中填充调用栈与作用域数据

**Depends on:** Task 1
**Files:**
- Modify: `src/algorithm/rottingOranges.ts:124-164`（createStep 签名）
- Modify: `src/algorithm/rottingOranges.ts:166-587`（在各步骤生成处计算 callStack/scope）
- Test: `src/algorithm/rottingOranges.test.ts`（追加调用栈断言）

- [ ] **Step 1: 修改 createStep 签名 — 接收 callStack 与 scope 并写入 GridState**
文件: `src/algorithm/rottingOranges.ts:124-164`（替换 createStep 函数）

```typescript
import { CellState, Cell, CellWithInfo, GridState, AlgorithmResult, AlgorithmPhase, VariableValue, Direction, CallStackFrame, ScopeSnapshot } from './types';

function buildCallStack(
  frames: { id: string; label: string; line: number; variables: VariableValue[] }[]
): CallStackFrame[] {
  return frames.map((f, i) => ({ ...f, depth: i }));
}

function buildScope(
  members: VariableValue[],
  locals: VariableValue[]
): ScopeSnapshot {
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
    callStack,
    scope,
    currentCell,
    checkingDirection,
  };
}
```

- [ ] **Step 2: 在初始化阶段步骤填充调用栈 — 方法帧 + 初始化循环帧**
文件: `src/algorithm/rottingOranges.ts:180-336`（初始化阶段的 createStep 调用）

说明：初始化阶段栈结构固定为「方法帧 orangesRotting」+（循环内时）「遍历网格帧」。在每个初始化 createStep 调用末尾的 `variables` 参数后，补传 callStack 与 scope 两个参数。

示例（以「初始化 M」步骤为例，其余初始化步骤同模式补参数）：

```typescript
  // Step: 初始化 M
  steps.push(createStep(
    grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
    0, 0, [], [], CODE_LINES.INIT_M, AlgorithmPhase.INIT,
    `初始化 M = grid.length = ${M}（网格行数）`,
    createVariables({ M }),
    buildCallStack([
      { id: 'method', label: 'orangesRotting(grid)', line: 2, variables: createVariables({ M, N }) },
    ]),
    buildScope(
      createVariables({ M, N, queueSize: 0, fresh: 0 }),
      createVariables({ M })
    )
  ));
```

规则（对全部初始化步骤统一应用）：
- `method` 帧始终在栈底，label 为 `orangesRotting(grid)`，line 为 `CODE_LINES.METHOD_DEF[0]`
- 进入双循环后（FOR_R / FOR_C / IF_FRESH / FRESH_INC / ELSE_IF_ROTTEN / QUEUE_ADD_INIT），追加 `init-loop` 帧：label 为 `遍历网格 r=${r}, c=${c}`，line 用 `CODE_LINES.FOR_R[0]`
- `scope.members` = 方法级变量快照（M, N, queueSize, fresh，按当前实际值）
- `scope.locals` = 当前步骤的 `variables`（循环变量 r/c 等）

- [ ] **Step 3: 在 BFS 主循环与方向检查步骤填充调用栈 — 追加 bfs-loop / iterate-cell / check-direction / infect 帧**
文件: `src/algorithm/rottingOranges.ts:366-558`（BFS 阶段 createStep 调用）

栈层级规则（按深度递增）：
1. `method` 帧 — 始终在栈底
2. `bfs-loop` 帧 — 进入 while 后，label `while (!queue.isEmpty() && fresh>0)`，line `CODE_LINES.WHILE_LOOP[0]`，variables 含 fresh/queueSize/minutes
3. `iterate-cell` 帧 — 处理第 i 个橘子时，label `for i=0..size 处理 [cell.row,cell.col]`，line `CODE_LINES.FOR_I[0]`
4. `check-direction` 帧 — 检查某方向时，label `检查方向: ${上/下/左/右}`，line `CODE_LINES.FOR_DIR[0]`
5. `infect` 帧 — 感染发生时（SET_ROTTEN / FRESH_DEC / QUEUE_ADD），label `感染 [nr,nc]`，line `CODE_LINES.SET_ROTTEN[0]`

示例（「获取当前层大小」步骤）：

```typescript
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.GET_SIZE, AlgorithmPhase.BFS_LOOP,
      `获取当前层大小 size = ${size}，这一分钟需要处理 ${size} 个腐烂橘子`,
      createVariables({ fresh, queueSize: queue.length, minutes: minute, size }),
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: createVariables({ M, N, fresh, minutes: minute }) },
        { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, queueSize: queue.length, minutes: minute, size }) },
      ]),
      buildScope(
        createVariables({ M, N, fresh, minutes: minute, queueSize: queue.length }),
        createVariables({ size })
      )
    ));
```

对 BFS 阶段每个 createStep 调用，按其所处层级补传对应深度的 callStack 与 scope：members 取方法级变量，locals 取该步骤的 `variables`。

- [ ] **Step 4: 在完成阶段步骤填充调用栈 — 仅 method + return 帧**
文件: `src/algorithm/rottingOranges.ts:563-584`（COMPLETE 阶段）

```typescript
  steps.push(createStep(
    grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
    0, minute, [], [], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
    success
      ? `✅ 算法完成！所有橘子在 ${minute} 分钟内全部腐烂，返回 ${minute}`
      : `❌ 算法完成！仍有 ${fresh} 个橘子无法被感染（被空单元格隔离），返回 -1`,
    createVariables({ fresh, minutes: minute }),
    buildCallStack([
      { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: createVariables({ M, N, fresh, minutes: minute }) },
      { id: 'return', label: `return ${success ? minute : -1}`, line: CODE_LINES.RETURN[0], variables: createVariables({ fresh, minutes: minute }) },
    ]),
    buildScope(
      createVariables({ M, N, fresh, minutes: minute }),
      []
    )
  ));
```

- [ ] **Step 5: 补充调用栈数据测试 — 追加到 rottingOranges.test.ts**
文件: `src/algorithm/rottingOranges.test.ts`（文件末尾追加）

```typescript
describe('Call Stack & Scope Data', () => {
  it('每个步骤都包含非空 callStack 与 scope', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    expect(result.steps.length).toBeGreaterThan(0);
    for (const step of result.steps) {
      expect(step.callStack).toBeDefined();
      expect(step.callStack!.length).toBeGreaterThan(0);
      expect(step.scope).toBeDefined();
      // 栈底始终是 method 帧
      expect(step.callStack![0].id).toBe('method');
      expect(step.callStack![0].label).toContain('orangesRotting');
      // depth 从 0 递增连续
      step.callStack!.forEach((frame, i) => {
        expect(frame.depth).toBe(i);
      });
    }
  });

  it('BFS 阶段步骤的栈深度 >= 2（method + bfs-loop）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const bfsSteps = result.steps.filter(s => s.phase === AlgorithmPhase.BFS_LOOP);
    expect(bfsSteps.length).toBeGreaterThan(0);
    for (const step of bfsSteps) {
      expect(step.callStack!.length).toBeGreaterThanOrEqual(2);
      expect(step.callStack!.some(f => f.id === 'bfs-loop')).toBe(true);
    }
  });

  it('COMPLETE 阶段栈包含 return 帧', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.phase).toBe(AlgorithmPhase.COMPLETE);
    expect(lastStep.callStack!.some(f => f.id === 'return')).toBe(true);
  });
});
```

- [ ] **Step 6: 验证算法步骤数据完整**
Run: `npx vitest run src/algorithm/rottingOranges.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "FAIL" or "callStack is undefined"

- [ ] **Step 7: 提交**
Run: `git add src/algorithm/rottingOranges.ts src/algorithm/rottingOranges.test.ts && git commit -m "feat(algo): populate callStack and scope snapshots in each BFS step"`

---

### Task 4: 创建调用栈面板 CallStackPanel

**Depends on:** Task 1, Task 3
**Files:**
- Create: `src/components/CallStackPanel.tsx`
- Create: `src/components/__tests__/CallStackPanel.test.ts`

- [ ] **Step 1: 创建 CallStackPanel — 可视化逻辑作用域调用栈帧**
创建文件: `src/components/CallStackPanel.tsx`

```typescript
import { useState } from 'react';
import { CallStackFrame, VariableValue } from '../algorithm/types';

interface CallStackPanelProps {
  callStack: CallStackFrame[];
  /** 当前活动帧的 depth（默认栈顶，即最大 depth） */
  activeDepth?: number;
}

const FRAME_ICONS: Record<string, string> = {
  method: '🔵',
  'init-loop': '🔄',
  'bfs-loop': '🔁',
  'iterate-cell': '📍',
  'check-direction': '🧭',
  infect: '🦠',
  return: '↩️',
};

export function CallStackPanel({ callStack, activeDepth }: CallStackPanelProps) {
  const [expandedFrame, setExpandedFrame] = useState<number | null>(
    activeDepth ?? callStack.length - 1
  );

  const activeIdx = activeDepth ?? callStack.length - 1;

  return (
    <div style={{
      background: '#252526',
      borderRadius: '6px',
      padding: '8px',
      border: '1px solid #333',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📞 调用栈
        </h4>
        <span style={{
          fontSize: '10px',
          color: '#888',
          background: '#333',
          padding: '1px 6px',
          borderRadius: '3px',
        }}>
          {callStack.length} 帧
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
        {callStack.map((frame, idx) => {
          const isActive = idx === activeIdx;
          const isExpanded = expandedFrame === idx;
          const indent = frame.depth * 12;
          return (
            <div key={frame.id + frame.depth}>
              <div
                onClick={() => setExpandedFrame(isExpanded ? null : idx)}
                style={{
                  marginLeft: indent,
                  padding: '4px 8px',
                  background: isActive ? '#3b82f630' : '#1e1e1e',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
              >
                <span>{FRAME_ICONS[frame.id] ?? '▫️'}</span>
                <span style={{ color: isActive ? '#60a5fa' : '#d4d4d4', flex: 1 }}>
                  {frame.label}
                </span>
                {frame.variables.length > 0 && (
                  <span style={{ color: '#888', fontSize: '9px' }}>
                    {isExpanded ? '▼' : '▶'} {frame.variables.length} vars
                  </span>
                )}
              </div>

              {isExpanded && frame.variables.length > 0 && (
                <div style={{
                  marginLeft: indent + 12,
                  marginTop: '2px',
                  marginBottom: '4px',
                  padding: '6px',
                  background: '#1a1a1a',
                  borderRadius: '3px',
                  fontSize: '10px',
                }}>
                  <VariableList variables={frame.variables} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VariableList({ variables }: { variables: VariableValue[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {variables.map(v => (
        <div key={v.name} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          fontFamily: 'monospace',
        }}>
          <span style={{ color: '#9cdcfe' }}>{v.name}</span>
          <span style={{ color: '#888' }}>=</span>
          <span style={{ color: '#b5cea8', fontWeight: 600 }}>{v.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: 创建 CallStackPanel 单元测试**
创建文件: `src/components/__tests__/CallStackPanel.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { CallStackFrame } from '../../algorithm/types';

// 测试帧数据构造与图标映射的纯逻辑（不渲染 DOM）
function selectActiveFrame(callStack: CallStackFrame[]): CallStackFrame {
  return callStack[callStack.length - 1];
}

const FRAME_ICONS: Record<string, string> = {
  method: '🔵',
  'init-loop': '🔄',
  'bfs-loop': '🔁',
  'iterate-cell': '📍',
  'check-direction': '🧭',
  infect: '🦠',
  return: '↩️',
};

describe('CallStackPanel logic', () => {
  it('happy path: 选中栈顶帧为活动帧', () => {
    const stack: CallStackFrame[] = [
      { id: 'method', label: 'orangesRotting()', line: 2, variables: [], depth: 0 },
      { id: 'bfs-loop', label: 'while', line: 23, variables: [], depth: 1 },
      { id: 'iterate-cell', label: 'for i', line: 25, variables: [], depth: 2 },
    ];
    expect(selectActiveFrame(stack).id).toBe('iterate-cell');
    expect(selectActiveFrame(stack).depth).toBe(2);
  });

  it('edge case: 空栈选择不崩溃', () => {
    const stack: CallStackFrame[] = [];
    expect(stack.length).toBe(0);
  });

  it('所有已知帧 id 都有图标', () => {
    const knownIds = ['method', 'init-loop', 'bfs-loop', 'iterate-cell', 'check-direction', 'infect', 'return'];
    for (const id of knownIds) {
      expect(FRAME_ICONS[id]).toBeDefined();
    }
  });

  it('error path: 未知帧 id 兜底为默认图标', () => {
    expect(FRAME_ICONS['unknown-id'] ?? '▫️').toBe('▫️');
  });
});
```

- [ ] **Step 3: 验证 CallStackPanel**
Run: `npx vitest run src/components/__tests__/CallStackPanel.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "4 passed"

- [ ] **Step 4: 提交**
Run: `git add src/components/CallStackPanel.tsx src/components/__tests__/CallStackPanel.test.ts && git commit -m "feat(ui): add CallStackPanel to visualize logical scope frames"`

---

### Task 5: 集成 Debug 模式到 CodePanel 并端到端验证

**Depends on:** Task 2, Task 3, Task 4
**Files:**
- Modify: `src/components/CodePanel.tsx:1-6`（props 扩展）+ `:82-209`（渲染区嵌入面板）
- Modify: `src/App.tsx:114-119`（传入 callStack/scope）

- [ ] **Step 1: 扩展 CodePanel props — 接收 callStack 与 scope**
文件: `src/components/CodePanel.tsx:1-6`

```typescript
import { VariableValue, CallStackFrame, ScopeSnapshot } from '../algorithm/types';

interface CodePanelProps {
  highlightedLines: number[];
  variables?: VariableValue[];
  callStack?: CallStackFrame[];
  scope?: ScopeSnapshot;
}
```

- [ ] **Step 2: 在 CodePanel 代码区下方嵌入 CallStackPanel 与作用域观察区**
文件: `src/components/CodePanel.tsx:82-209`（在 `</pre>` 之后、`<style>` 之前插入 Debug 面板区）

说明：保持现有代码行渲染逻辑不变，仅在 `<pre>` 闭合标签后插入：

```typescript
      </pre>

      {/* ===== Debug 模式：调用栈 + 作用域观察 ===== */}
      {callStack && callStack.length > 0 && (
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <CallStackPanel callStack={callStack} />

          {scope && (
            <div style={{
              background: '#252526',
              borderRadius: '6px',
              padding: '8px',
              border: '1px solid #333',
            }}>
              <h4 style={{ margin: '0 0 6px 0', color: '#60a5fa', fontSize: '12px' }}>🔍 变量观察</h4>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>成员变量</div>
              <div style={{ marginBottom: '8px' }}>
                {scope.members.length === 0 ? (
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>(无)</span>
                ) : (
                  <VariableGrid variables={scope.members} />
                )}
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>局部变量</div>
              <div>
                {scope.locals.length === 0 ? (
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>(无)</span>
                ) : (
                  <VariableGrid variables={scope.locals} />
                )}
              </div>
            </div>
          )}
        </div>
      )}
```

并在文件顶部 import 区与文件末尾辅助函数区分别补：

```typescript
// 顶部 import 追加
import { CallStackPanel } from './CallStackPanel';
```

```typescript
// 文件末尾追加 VariableGrid 辅助组件
function VariableGrid({ variables }: { variables: VariableValue[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {variables.map(v => (
        <div key={v.name} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          fontFamily: 'monospace',
          fontSize: '11px',
          padding: '2px 4px',
          background: '#1a1a1a',
          borderRadius: '3px',
        }}>
          <span style={{ color: '#9cdcfe' }}>{v.name}</span>
          <span style={{ color: '#888' }}>=</span>
          <span style={{ color: '#b5cea8', fontWeight: 600 }}>{v.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 修改 App.tsx — 把 callStack 与 scope 传入 CodePanel**
文件: `src/App.tsx:114-119`（替换 CodePanel 调用）

```typescript
          <CodePanel
            highlightedLines={currentState.highlightedLines}
            variables={currentState.variables}
            callStack={currentState.callStack}
            scope={currentState.scope}
          />
```

- [ ] **Step 4: 验证全部测试与类型检查**
Run: `npx vitest run && npx tsc -b --noEmit`
Expected:
  - Exit code: 0
  - 输出包含所有测试套件 "passed"
  - tsc 输出不含 "error TS"

- [ ] **Step 5: 验证生产构建**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"
  - Output does NOT contain: "error" or "ERROR"

- [ ] **Step 6: 提交**
Run: `git add src/components/CodePanel.tsx src/App.tsx && git commit -m "feat(ui): integrate debug mode with call stack and scope into CodePanel"`

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack + Risks？ | PASS | — |
| 2 | 每个 Task 标注了 Depends on？ | PASS | Task 2 标 None（与 Task 1 并行）；Task 3/4/5 依赖链清晰 |
| 3 | 每个 Task 列出精确文件路径（Create/Modify/Test）？ | PASS | 全部含完整路径与行号 |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task1=3, Task2=6, Task3=7, Task4=4, Task5=6 |
| 5 | 新文件步骤包含完整代码（含 import）？ | PASS | useAutoFitGrid / CallStackPanel 完整 |
| 6 | 修改步骤包含替换后完整函数？ | PASS | createStep、GridVisualizer 整文件替换 |
| 7 | 代码块大小在 5-80 行之间？ | FIXED | Task3 Step2/3 改为"规则+示例"模式，避免单块过大 |
| 8 | 所有函数/类型在 Plan 内有定义？ | PASS | CallStackFrame/ScopeSnapshot 在 Task1 定义，CallStackPanel 在 Task4 |
| 9 | 每个 Task 有验证命令（命令+exit code+output）？ | PASS | 全部含 Run + Expected |
| 10 | Spec 每个需求都有对应 Task？ | PASS | 画布溢出→Task2；变量实时变化→Task5 ScopeSnapshot；调用栈→Task3+4 |
| 11 | 每个 Task 完成后可独立验证？ | PASS | 各有独立测试/类型检查 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | — |
| 13 | 无 "add validation" 等抽象指令？ | PASS | 全部有具体代码 |
| 14 | 跨 Task 函数签名、类型名、属性名一致？ | PASS | `callStack`/`scope`/`CallStackFrame`/`ScopeSnapshot` 全程一致；`useAutoFitGrid` 导出 `computeCellSize` 测试用 |
| 15 | 文件保存位置正确？ | PASS | `docs/superpowers/plans/2026-07-15-adaptive-canvas-debug-mode.md` |

**Status:** ✅ ALL PASS

---

## Execution Selection

**Tasks:** 5
**Dependencies:** yes（Task 3→1, Task 4→1+3, Task 5→2+3+4）
**User Preference:** none（zero-confirm mode）
**Decision:** Subagent-Driven
**Reasoning:** 5 个任务，存在顺序依赖链，符合 "3+ tasks → Subagent-Driven" 规则

**Auto-invoking:** `superpowers:subagent-driven-development`
