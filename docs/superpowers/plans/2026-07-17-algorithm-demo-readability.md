# 算法演示可读性优化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 把算法演示从"逐行代码执行"粒度升级为"逐关键事件 + 画布强相关"粒度，让用户每按一下都能看到画布有意义的视觉变化并读懂这一步发生了什么。

**Architecture:** 数据流：用户按 ▶/→ → App 推进 currentStep → GridVisualizer 渲染该 step 的 grid/currentCell/checkingDirection/newlyRotten。关键改造在 `generateSteps`（rottingOranges.ts）—— 把 172~189 个逐行 step 压缩为 ~20-30 个关键事件 step：初始化合并为 3 个（定义变量 / 遍历网格统计入队 / 就绪进入 BFS），每个方向检查的"计算 nr / 计算 nc / 越界判断"三步合并为 1 个"检查方向"step，感染"设腐烂 / fresh-- / 入队"三步合并为 1 个"感染"step。每个 step 的 description 改为叙事句（"第 1 分钟：从 [0,0] 开始扩散，感染了 2 个橘子"）替代实现细节（"fresh-- 减少到 3"）。GridVisualizer 增加 BFS 波次色环（同分钟感染格子共享色相）与方向箭头（checkingDirection 指向目标格），让用户眼睛知道看哪。StatePanel 增加当前分钟的叙事摘要。改动集中在算法层 + 3 个组件，不动数据契约 GridState 的现有字段，只新增 `waveColor`/`targetCell` 两个可选字段。

**Tech Stack:** React 18.3, TypeScript 5.6（noUnusedLocals/noUnusedParameters/strict）, D3 7.9, Vitest 2.1, fast-check

**Risks:**
- 重写 generateSteps（rottingOranges.ts ~937 行主函数）风险最高 → 缓解：保留所有辅助函数（cloneGrid/countOranges/createCellInfoGrid/createVariables/buildCallStack/buildScope/createStep 与 CODE_LINES/VARIABLE_LINE_MAP）不变，只重写 generateSteps 函数体；finalMinutes/success 计算逻辑完全保留；每 Task 后跑全量 33 测试保底
- 测试对 phase 有约束（最后步必 COMPLETE、BFS 步栈深≥2、每步非空 callStack/scope、第一帧 id=method）→ 缓解：保留 AlgorithmPhase 枚举与 callStack 结构契约，重构后所有现有 phase 测试仍通过
- GridVisualizer 视觉层与已有 d3.zoom 叠加可能冲突 → 缓解：波次色环作为 rect 的 stroke 叠加层、方向箭头作为 root `<g>` 内独立 `<path>`，都在 root 内随 zoom 缩放，不新增 svg 事件行为
- 合并 step 后 GridState 现有字段仍要被各组件正确消费 → 缓解：只新增可选字段，不改现有字段语义；currentCell/checkingDirection/newlyRotten 仍按原样驱动渲染

---

### Task 1: 扩展 GridState 类型 — 新增波次色与目标格字段

**Depends on:** None
**Files:**
- Modify: `src/algorithm/types.ts:35-59`（GridState 接口新增 2 个可选字段）

- [ ] **Step 1: 给 GridState 新增 waveColor 与 targetCell 字段 — 供视觉层渲染波次色环与方向箭头**
文件: `src/algorithm/types.ts:35-59`（在 GridState 接口的 checkingDirection 字段后、注释 `// ===== 新增：Debug 模式数据 =====` 之前插入 2 个字段）

```typescript
// 替换 src/algorithm/types.ts 中 GridState 接口的尾部字段定义
// 定位：在 `checkingDirection?: Direction;` 这一行之后、`// ===== 新增：Debug 模式数据 =====` 注释之前插入
  checkingDirection?: Direction;
  // ===== 新增：可读性视觉辅助字段 =====
  /** 当前 BFS 波次（分钟数）对应的色相，用于给本轮新感染的格子加色环，让用户看清"一整波同时扩散" */
  waveColor?: string;
  /** 当前正在检查/感染的目标格子（方向箭头终点），让用户眼睛知道看哪个格子 */
  targetCell?: Cell;
  // ===== 新增：Debug 模式数据 =====
```

说明：
- `waveColor`：算法层在每次 BFS 分钟推进时计算一个色相字符串（如 `'#fbbf24'`），GridVisualizer 给该分钟 newlyRotten 的格子加同色 stroke，用户能看到"同一分钟被感染的橘子属于同一波"
- `targetCell`：方向检查时指向的相邻格子坐标，GridVisualizer 画箭头从 currentCell 指向 targetCell
- 两个都是可选字段，不传时组件回退到现有行为，不破坏向后兼容

- [ ] **Step 2: 验证类型**
Run: `npx tsc --noEmit 2>&1 | tail -3`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"

- [ ] **Step 3: 提交**
Run: `git add src/algorithm/types.ts && git commit -m "refactor(types): add waveColor and targetCell fields to GridState for readability visuals"`

---

### Task 2: 重构 generateSteps — 合并琐碎 step，叙事化 description

**Depends on:** Task 1
**Files:**
- Modify: `src/algorithm/rottingOranges.ts:178-936`（重写 generateSteps 函数体，保留辅助函数）
- Test: `src/algorithm/rottingOranges.test.ts`（新增粒度合理性断言）

- [ ] **Step 1: 在 generateSteps 之前新增波次色相计算辅助函数 — 为每分钟分配稳定色相**
文件: `src/algorithm/rottingOranges.ts`（在 `export function generateSteps` 之前插入新函数）

```typescript
// 在 src/algorithm/rottingOranges.ts 的 `export function generateSteps` 之前插入：

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
```

说明：色相表 6 色循环，足够区分常见网格的前几波；`getWaveColor(minute)` 对 minute 0/1/2... 各给不同色，同一分钟的所有感染格子共享同一色 → 画布上同色环的格子就是同一波被感染的。

- [ ] **Step 2: 重写 generateSteps 初始化阶段 — 17 个逐行 step 合并为 3 个关键事件 step**
文件: `src/algorithm/rottingOranges.ts:190-519`（替换第一阶段初始化到"没有腐烂橘子"提前返回之前，即从 `// ========== 第一阶段：初始化 ==========` 到 `if (queue.length === 0 && fresh > 0) {` 之前）

```typescript
// 替换 src/algorithm/rottingOranges.ts 中从 `// ========== 第一阶段：初始化 ==========` 
// 到 `// 如果没有腐烂橘子但有新鲜橘子` 之前的整个初始化区块（原 :190-519）

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

  if (queue.length === 0 && fresh > 0) {
    const variables = createVariables({ fresh, minutes: 0 });
    const members = createVariables({ M, N, queueSize: 0, fresh, minutes: 0 });
    steps.push(createStep(
      grid, cellInfoGrid, 0, fresh, currentRotten, empty, totalCells, initialFresh,
      0, 0, [], [], CODE_LINES.RETURN, AlgorithmPhase.COMPLETE,
      `没有腐烂橘子作为感染源，但还有 ${fresh} 个新鲜橘子无法被感染，返回 -1`,
      variables,
      buildCallStack([
        { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
        { id: 'return', label: `return -1`, line: CODE_LINES.RETURN[0], variables: createVariables({ minutes: 0 }) },
      ]),
      buildScope(members, variables)
    ));
    return { steps, finalMinutes: -1, success: false };
  }
```

说明：
- 原 17+ 个初始化 step（定义类、初始化 M、初始化 N、初始化队列、初始化 fresh、遍历注释、每格循环、发现新鲜/腐烂/空、fresh++、入队、总结、初始化 minutes、初始化 dirs）合并为 3 个：①进入方法+初始化变量 ②遍历网格统计入队 ③就绪。用户不再按十几下还停在初始化。
- 每步 description 是叙事句，解释"做了什么+结果+为什么"，而非"fresh++ 增加到 3"。
- 提前返回（示例3 的 fresh=0、无腐烂有新鲜）保留为单步 COMPLETE。
- callStack 结构契约保留：method 帧 id='method' label 含 'orangesRotting'，depth 从 0 起。

- [ ] **Step 3: 重写 BFS 主循环 — 合并方向检查与感染子步骤，每步带 waveColor/targetCell**
文件: `src/algorithm/rottingOranges.ts:522-891`（替换从 `// ========== 第三阶段：BFS 主循环 ==========` 到 `}` 闭合 while 循环之前的整个 BFS 区块，即原 :522-891）

```typescript
// 替换 src/algorithm/rottingOranges.ts 中 BFS 主循环整个区块
// 定位：从 `// ========== 第三阶段：BFS 主循环 ==========` 到 while 循环结束的 `}`

  // ========== 第三阶段：BFS 主循环（逐分钟扩散，每步有画布变化） ==========

  let minute = 0;

  // Step: 进入 BFS
  {
    const waveColor = getWaveColor(minute);
    const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute });
    const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
    steps.push(createStep(
      grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
      0, minute, [], [...queue], CODE_LINES.COMMENT_BFS, AlgorithmPhase.BFS_LOOP,
      `开始 BFS 广度优先搜索。原理：每分钟，队列里所有腐烂橘子同时向四个方向扩散感染。第 ${minute} 分钟色环=${waveColor}`,
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
    const newlyRotten: Cell[] = [];

    // Step: 第 minute 分钟开始 — 告诉用户这一波要处理几个源橘子
    {
      const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute, size });
      const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        0, minute, [], [...queue], CODE_LINES.GET_SIZE, AlgorithmPhase.BFS_LOOP,
        `第 ${minute} 分钟开始：队列里有 ${size} 个腐烂橘子将同时向四周扩散（同色环=${waveColor} 的格子属于这一波）。剩余新鲜橘子 ${fresh}`,
        variables,
        buildCallStack([
          { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
          { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length, size }) },
        ]),
        buildScope(members, variables),
        undefined, undefined, waveColor
      ));
    }

    // 处理当前层的每个腐烂橘子
    for (let i = 0; i < size; i++) {
      const cell = queue.shift()!;
      const cellVars = createVariables({ i, size, currentR: cell.row, currentC: cell.col });

      // Step: 取出当前源橘子（合并原 for/出队/取坐标 3 步）
      {
        const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute, currentR: cell.row, currentC: cell.col });
        const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
        steps.push(createStep(
          grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
          0, minute, [...newlyRotten], [...queue], CODE_LINES.POLL, AlgorithmPhase.BFS_LOOP,
          `取出第 ${i + 1}/${size} 个源橘子 [${cell.row},${cell.col}]（蓝色边框高亮）。它将检查上下左右四个相邻格子`,
          variables,
          buildCallStack([
            { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
            { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
            { id: 'iterate-cell', label: `处理第 ${i + 1}/${size} 个橘子 [${cell.row},${cell.col}]`, line: CODE_LINES.FOR_I[0], variables: cellVars },
          ]),
          buildScope(members, variables),
          cell, undefined, waveColor
        ));
      }

      // 检查四个方向 —— 命中新鲜橘子才推感染 step，否则合并为 1 个"检查无感染"step
      let infectedAny = false;
      const infectedCells: Cell[] = [];

      for (let d = 0; d < DIRECTIONS.length; d++) {
        const [dr, dc] = DIRECTIONS[d];
        const dirName = DIRECTION_NAMES[d];
        const dirChinese = dirName === 'up' ? '上' : dirName === 'down' ? '下' : dirName === 'left' ? '左' : '右';
        const nr = cell.row + dr;
        const nc = cell.col + dc;
        const inBounds = nr >= 0 && nr < M && nc >= 0 && nc < N;
        const isFresh = inBounds && grid[nr][nc] === CellState.FRESH;

        if (!isFresh) {
          // 跳过：越界或非新鲜 —— 不推 step（避免零视觉变化的 step）
          continue;
        }

        // 命中新鲜橘子 —— 推 1 个感染 step（合并原 检查方向/算nr/算nc/设腐烂/fresh--/入队 6 步）
        // Step: 检查方向并感染
        {
          grid[nr][nc] = CellState.ROTTEN;
          cellInfoGrid[nr][nc].state = CellState.ROTTEN;
          cellInfoGrid[nr][nc].infectionTime = minute + 1;
          fresh--;
          currentRotten++;
          queue.push({ row: nr, col: nc });
          newlyRotten.push({ row: nr, col: nc });
          infectedCells.push({ row: nr, col: nc });
          infectedAny = true;

          const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute, currentR: cell.row, currentC: cell.col, nr, nc });
          const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
          steps.push(createStep(
            grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
            0, minute, [...newlyRotten], [...queue], CODE_LINES.SET_ROTTEN, AlgorithmPhase.INFECT,
            `源 [${cell.row},${cell.col}] 检查${dirChinese}方向 → 相邻 [${nr},${nc}] 是新鲜橘子，感染！橘子变褐（${waveColor} 色环）、fresh=${fresh}、新感染橘子入队`,
            variables,
            buildCallStack([
              { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
              { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
              { id: 'iterate-cell', label: `处理第 ${i + 1}/${size} 个橘子 [${cell.row},${cell.col}]`, line: CODE_LINES.FOR_I[0], variables: createVariables({ i, size, currentR: cell.row, currentC: cell.col }) },
              { id: 'infect', label: `感染 [${nr},${nc}]`, line: CODE_LINES.SET_ROTTEN[0], variables: createVariables({ nr, nc, fresh }) },
            ]),
            buildScope(members, variables),
            cell, dirName, waveColor, { row: nr, col: nc }
          ));
        }
      }

      // 如果该源橘子四个方向都没感染到任何橘子，推 1 个说明 step（让用户知道这个源橘子"空转"了）
      if (!infectedAny) {
        const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute, currentR: cell.row, currentC: cell.col });
        const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
        steps.push(createStep(
          grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
          0, minute, [...newlyRotten], [...queue], CODE_LINES.FOR_DIR, AlgorithmPhase.CHECK_ADJACENT,
          `源 [${cell.row},${cell.col}] 检查四个方向：相邻格子都已腐烂或为空，本分钟未感染新橘子`,
          variables,
          buildCallStack([
            { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
            { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
            { id: 'iterate-cell', label: `处理第 ${i + 1}/${size} 个橘子 [${cell.row},${cell.col}]`, line: CODE_LINES.FOR_I[0], variables: createVariables({ currentR: cell.row, currentC: cell.col }) },
            { id: 'check-direction', label: `检查四方向（无命中）`, line: CODE_LINES.FOR_DIR[0], variables: createVariables({ currentR: cell.row, currentC: cell.col }) },
          ]),
          buildScope(members, variables),
          cell, undefined, waveColor
        ));
      }
    }

    // 第 minute 分钟结束 —— 推 1 个分钟总结 step（仅当有感染发生）
    if (newlyRotten.length > 0) {
      minute++;
      const newWaveColor = getWaveColor(minute - 1);
      const variables = createVariables({ fresh, queueSize: queue.length, minutes: minute });
      const members = createVariables({ M, N, queueSize: queue.length, fresh, minutes: minute });
      steps.push(createStep(
        grid, cellInfoGrid, minute, fresh, currentRotten, empty, totalCells, initialFresh,
        newlyRotten.length, minute - 1, [...newlyRotten], [...queue], CODE_LINES.MINUTES_INC, AlgorithmPhase.INFECT,
        `第 ${minute - 1} 分钟结束：本波共感染 ${newlyRotten.length} 个橘子（${newWaveColor} 色环标记）。minutes=${minute}。剩余新鲜橘子 ${fresh}${fresh === 0 ? '，全部感染完成！' : ''}`,
        variables,
        buildCallStack([
          { id: 'method', label: 'orangesRotting(grid)', line: CODE_LINES.METHOD_DEF[0], variables: members },
          { id: 'bfs-loop', label: `while (minute=${minute}, fresh=${fresh})`, line: CODE_LINES.WHILE_LOOP[0], variables: createVariables({ fresh, minutes: minute, queueSize: queue.length }) },
        ]),
        buildScope(members, variables),
        undefined, undefined, newWaveColor
      ));
    }
  }
```

说明：
- 原 BFS 每方向 6 step（检查方向/算 nr/算 nc/越界判断/设腐烂/fresh--/入队）→ 命中时合并为 1 个感染 step，未命中时不推 step（除非该源橘子完全空转，推 1 个说明）。示例 2 的 102 个 check_adjacent step 将降到 ~10-15 个。
- 每个感染 step **立即**让 grid[nr][nc] 变腐烂 → 画布立刻有视觉变化，用户按一下就看到一个橘子变褐。
- description 叙事化："源 [r,c] 检查右方向 → 相邻 [nr,nc] 是新鲜橘子，感染！橘子变褐（黄色色环）、fresh=3、新感染橘子入队"。
- 每个 BFS step 带 `waveColor`（同分钟同色）与感染 step 带 `targetCell`（方向箭头终点），供 Task 3 视觉层消费。
- callStack 结构契约保留：method/bfs-loop/iterate-cell/infect 帧，depth 递增，满足测试"BFS 步栈深≥2"。

- [ ] **Step 4: 重写返回结果阶段 — 保留单步 COMPLETE 与 return 帧**
文件: `src/algorithm/rottingOranges.ts:893-936`（替换从 `// ========== 第四阶段：返回结果 ==========` 到函数结尾 `}`）

```typescript
// 替换 src/algorithm/rottingOranges.ts 中返回结果阶段
// 定位：从 `// ========== 第四阶段：返回结果 ==========` 到 generateSteps 函数闭合 `}`

  // ========== 第四阶段：返回结果 ==========

  // Step: while 退出说明
  {
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
```

说明：
- 保留 while 退出说明 step + 返回 step 共 2 步，最后一步 phase=COMPLETE 且栈含 return 帧，满足测试约束。
- finalMinutes/success 逻辑与原实现完全一致（success = fresh===0），保证 Property 6 正确性测试仍过。

- [ ] **Step 5: 更新 createStep 签名以接收新字段 waveColor 与 targetCell**
文件: `src/algorithm/rottingOranges.ts:132-176`（替换 createStep 函数）

```typescript
// 替换 src/algorithm/rottingOranges.ts 中 createStep 函数（原 :132-176）
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
  targetCell?: Cell
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
  };
}
```

说明：在原 createStep 末尾新增 `waveColor` 与 `targetCell` 两个可选参数并写入返回对象。所有现有调用点用 `undefined` 占位（Task 2 Step 2-4 已处理），向后兼容。

- [ ] **Step 6: 验证算法层类型与现有测试**
Run: `npx tsc --noEmit 2>&1 | tail -5 && npm test -- --run 2>&1 | tail -8`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "error" or "FAIL"

- [ ] **Step 7: 新增 step 粒度合理性测试 — 断言初始化 step ≤5、总 step 大幅减少**
文件: `src/algorithm/rottingOranges.test.ts`（在文件末尾追加新 describe 块）

```typescript
// 在 src/algorithm/rottingOranges.test.ts 文件末尾追加：

describe('演示可读性：step 粒度合理性', () => {
  it('示例1：初始化阶段 step 不超过 5 个（原 17+）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const initSteps = result.steps.filter(s => s.phase === AlgorithmPhase.INIT);
    expect(initSteps.length).toBeLessThanOrEqual(5);
  });

  it('示例1：总 step 数显著减少（原 172 → 应 < 50）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    expect(result.steps.length).toBeLessThan(50);
  });

  it('示例2：check_adjacent 阶段 step 大幅减少（原 102 → 应 < 30）', () => {
    const grid: CellState[][] = [[2, 1, 1], [0, 1, 1], [1, 0, 1]];
    const result = generateSteps(grid);
    const checkSteps = result.steps.filter(s => s.phase === AlgorithmPhase.CHECK_ADJACENT);
    expect(checkSteps.length).toBeLessThan(30);
  });

  it('每个 INFECT step 都带 waveColor 和 targetCell（视觉强相关）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const infectSteps = result.steps.filter(s => s.phase === AlgorithmPhase.INFECT);
    for (const s of infectSteps) {
      expect(s.waveColor).toBeDefined();
      expect(s.targetCell).toBeDefined();
    }
  });

  it('description 是叙事句（含中文标点或箭头，非纯代码行）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    for (const s of result.steps) {
      // 叙事句应含中文逗号、句号、箭头 → 等可读符号
      const isNarrative = /[，。→！]/.test(s.description);
      expect(isNarrative).toBe(true);
    }
  });
});
```

说明：5 个新测试用例验证可读性目标达成——初始化 step ≤5、总数 <50、check_adjacent <30、感染 step 带视觉字段、description 叙事化。这些断言把"可读性"量化为可测量的指标，防止回退。

- [ ] **Step 8: 验证全部测试通过**
Run: `npm test -- --run 2>&1 | tail -8`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "FAIL"

- [ ] **Step 9: 提交**
Run: `git add src/algorithm/rottingOranges.ts src/algorithm/rottingOranges.test.ts && git commit -m "refactor(algorithm): merge trivial steps into key events with narrative descriptions for readability"`

---

### Task 3: GridVisualizer 视觉强化 — 波次色环与方向箭头

**Depends on:** Task 2
**Files:**
- Modify: `src/components/GridVisualizer.tsx:1-134`（消费 waveColor/targetCell，渲染色环与箭头）

- [ ] **Step 1: 在 GridVisualizer 解构新字段并渲染波次色环**
文件: `src/components/GridVisualizer.tsx:22-30`（在解构 gridState 处新增字段）+ `:64-79`（rect stroke 渲染处叠加色环）

```typescript
// 替换 src/components/GridVisualizer.tsx 中 GridVisualizer 函数的解构与 rect 渲染部分
// 定位：从 `export function GridVisualizer({` 到 rect 的 .style('filter') 行

export function GridVisualizer({
  gridState,
  cellSize = 60,
  showCoordinates = true,
  showInfectionTime = true,
}: GridVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { grid, cellInfoGrid, newlyRotten, currentCell, waveColor, targetCell, checkingDirection } = gridState;
```

```typescript
// 替换 src/components/GridVisualizer.tsx 中 cells.append('rect') 到 .style('filter') 区块（原 :64-79）
    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', Math.max(4, cellSize * 0.12))
      .attr('fill', d => COLORS[d.state])
      .attr('stroke', d => {
        // 优先级：当前格子 > 新感染(波次色环) > 默认透明
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return '#60a5fa';
        if (isNewlyRotten(d.r, d.c, newlyRotten) && waveColor) return waveColor;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return '#fbbf24';
        return 'transparent';
      })
      .attr('stroke-width', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return 4;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return 3;
        return 0;
      })
      .style('filter', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return 'drop-shadow(0 0 8px #60a5fa)';
        if (isNewlyRotten(d.r, d.c, newlyRotten) && waveColor) return `drop-shadow(0 0 8px ${waveColor})`;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return 'drop-shadow(0 0 8px #fbbf24)';
        return 'none';
      });
```

说明：
- newlyRotten 格子的 stroke 取 `waveColor`（同分钟同色），用户一眼看出"哪些格子是同一波被感染的"。
- currentCell（当前源橘子）优先蓝色高亮 + 蓝色发光，与感染色环区分。
- 无 waveColor 时回退原 `#fbbf24`，向后兼容。

- [ ] **Step 2: 在 root 内渲染方向箭头 — 从 currentCell 指向 targetCell**
文件: `src/components/GridVisualizer.tsx`（在 d3.zoom 挂载之前、`cells.filter(...).text('初始')` 之后插入箭头渲染）

```typescript
// 在 src/components/GridVisualizer.tsx 的 useEffect 内、
// `cells.filter(d => d.state === CellState.ROTTEN && ...).text('初始')` 之后、
// `const zoom = d3.zoom` 之前插入：

    // 方向箭头：从当前源格子指向正在检查/感染的目标格子
    if (currentCell && targetCell) {
      const cx = currentCell.col * (cellSize + gap) + cellSize / 2;
      const cy = currentCell.row * (cellSize + gap) + cellSize / 2;
      const tx = targetCell.col * (cellSize + gap) + cellSize / 2;
      const ty = targetCell.row * (cellSize + gap) + cellSize / 2;
      // 缩短箭头两端，避免压在格子中心
      const dx = tx - cx, dy = ty - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const x1 = cx + ux * (cellSize * 0.35);
      const y1 = cy + uy * (cellSize * 0.35);
      const x2 = tx - ux * (cellSize * 0.35);
      const y2 = ty - uy * (cellSize * 0.35);
      const arrowColor = waveColor || '#fbbf24';
      root.append('defs')
        .append('marker')
        .attr('id', 'dir-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', arrowColor);
      root.append('line')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', arrowColor)
        .attr('stroke-width', Math.max(2, cellSize * 0.08))
        .attr('stroke-linecap', 'round')
        .attr('marker-end', 'url(#dir-arrow)')
        .style('filter', `drop-shadow(0 0 4px ${arrowColor})`);
    }
```

说明：
- 当 step 有 currentCell + targetCell（感染 step）时，画一条带箭头的线从源格子指向被感染格子，用户眼睛立刻知道"这一步是从哪里感染到哪里"。
- 箭头颜色取 waveColor，与色环统一，强化"同一波"的视觉关联。
- 箭头挂在 root `<g>` 内，随 d3.zoom 缩放平移，不冲突。

- [ ] **Step 3: 验证类型与测试**
Run: `npx tsc --noEmit 2>&1 | tail -3 && npm test -- --run 2>&1 | tail -4`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "error"

- [ ] **Step 4: 提交**
Run: `git add src/components/GridVisualizer.tsx && git commit -m "feat(canvas): render wave color ring and direction arrow for readability"`

---

### Task 4: StatePanel 叙事摘要 — 显示当前分钟发生了什么

**Depends on:** Task 2
**Files:**
- Modify: `src/components/StatePanel.tsx:41-146`（新增分钟叙事摘要块）

- [ ] **Step 1: 在 StatePanel 顶部新增当前分钟叙事摘要 — 让用户读懂"这一步在干嘛"**
文件: `src/components/StatePanel.tsx:41-59`（在 return 的最外层 div 内、标题块之前插入摘要块）+ `:1-16`（props 新增 description 已有，复用）

```typescript
// 替换 src/components/StatePanel.tsx 中 return 块的开头部分
// 定位：从 `return (` 到 `📊 算法状态` 标题块之前，插入叙事摘要块

  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '8px',
      padding: '8px',
      height: '100%',
      overflow: 'auto',
    }}>
      {/* 当前步骤叙事摘要 — 用户第一眼看到的"这一步在做什么" */}
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e3a8a',
        borderRadius: '6px',
        padding: '8px',
        marginBottom: '8px',
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#e5e7eb',
      }}>
        <div style={{ fontSize: '10px', color: '#60a5fa', marginBottom: '4px', letterSpacing: '0.5px' }}>
          📖 当前步骤
        </div>
        {description}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '13px' }}>📊 算法状态</h3>
        <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>
          {minute} / {bfsWave}
        </span>
      </div>
```

说明：
- 在 StatePanel 最顶部加一个"📖 当前步骤"摘要块，直接显示 step 的 description（叙事句）。
- 这是用户读演示的第一信息源——不用低头看 CodePanel 的描述行，状态面板顶部就告诉用户"第 1 分钟开始：队列里有 2 个腐烂橘子将同时扩散..."。
- 复用已有的 `description` prop，无需新增 props。
- 原底部 `💡 {description}` 描述块保留（冗余但无害，底部描述在滚动时仍可见）。

- [ ] **Step 2: 验证类型与测试**
Run: `npx tsc --noEmit 2>&1 | tail -3 && npm test -- --run 2>&1 | tail -4`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "error"

- [ ] **Step 3: 提交**
Run: `git add src/components/StatePanel.tsx && git commit -m "feat(ui): show narrative step summary at top of state panel"`

---

### Task 5: 端到端验证 — 可读性目标达成确认

**Depends on:** Task 2, Task 4
**Files:**
- Test: 全量测试 + 构建 + 截图验证

- [ ] **Step 1: 全量测试与类型检查**
Run: `npx tsc --noEmit 2>&1 | tail -3 && npm test -- --run 2>&1 | tail -8 && npm run build 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "error" or "FAIL"

- [ ] **Step 2: 用 vite-node 统计优化后各示例的 step 数 — 量化可读性提升**
Run: `npx vite-node -e "import{generateSteps} from'./src/algorithm/rottingOranges.ts';const g1=[[2,1,1],[1,1,0],[0,1,1]];const r1=generateSteps(g1);console.log('示例1 step 数:',r1.steps.length);const g2=[[2,1,1],[0,1,1],[1,0,1]];const r2=generateSteps(g2);console.log('示例2 step 数:',r2.steps.length);"`
Expected:
  - Exit code: 0
  - Output contains: "示例1 step 数:"
  - 示例1 step 数 < 50（原 172）
  - 示例2 step 数 < 60（原 189）

- [ ] **Step 3: 推送并触发部署**
Run: `git push origin feat/adaptive-canvas-debug-mode 2>&1 | tail -3`
Expected:
  - Exit code: 0
  - Output contains: "->"（推送成功）

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack？ | PASS | — |
| 2 | 每个 Task 标注 Depends on？ | PASS | Task1 None / Task2 依赖1 / Task3 依赖2 / Task4 依赖2 / Task5 依赖2,4 |
| 3 | 每个 Task 列出精确文件路径？ | PASS | types.ts:35-59 / rottingOranges.ts:178-936（分段标注）+ createStep:132-176 / GridVisualizer.tsx:1-134 / StatePanel.tsx:41-146 |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task1=3 / Task2=9（重写大函数，9步对应4个阶段+签名+测试+验证+提交，必要） / Task3=4 / Task4=3 / Task5=3 |
| 5 | 新文件步骤包含完整代码？ | N/A | 无新文件（全部 Modify） |
| 6 | 修改步骤包含替换后完整区块？ | PASS | 每个修改 Step 都给出完整替换区块 + 定位锚点 |
| 7 | 代码块大小 5-80 行？ | FIXED | Task2 Step3 BFS 区块 ~120 行（整段单一职责的函数体替换，强拆会破坏可执行性）→ 标注：超 80 行为完整单一职责函数体，不可拆；其余均 <80 |
| 8 | 所有引用已定义？ | PASS | createStep/buildCallStack/buildScope/createVariables/CODE_LINES/VARIABLE_LINE_MAP/DIRECTIONS/DIRECTION_NAMES/getWaveColor（Task2 Step1 定义）/AlgorithmPhase 均已在文件内定义或本 Plan 内定义 |
| 9 | 每个 Task 有验证命令？ | PASS | 各 Task 含 tsc/test/build 验证 + exit code + output pattern |
| 10 | Spec 每个需求有对应 Task？ | PASS | 步骤看不懂→Task2(合并step+叙事) + Task4(摘要) / 画布视觉看不懂→Task3(色环+箭头) / 验证→Task5 |
| 11 | 每个 Task 完成后可独立验证？ | PASS | tsc/测试可独立跑 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | — |
| 13 | 无抽象指令？ | PASS | 全部具体代码 |
| 14 | 跨 Task 一致性？ | PASS | waveColor/targetCell 字段名跨 Task1(定义)/Task2(赋值)/Task3(消费)一致；createStep 签名与 Task2 调用点参数顺序一致；getWaveColor 在 Task2 Step1 定义、Step2-4 使用 |
| 15 | 文件保存位置正确？ | PASS | `docs/superpowers/plans/2026-07-17-algorithm-demo-readability.md` |

**Status:** ✅ ALL PASS

---

## Execution Selection

**Tasks:** 5
**Dependencies:** yes（Task2 依赖 Task1 类型字段；Task3/4 依赖 Task2 数据；Task5 依赖 Task2,4）
**User Preference:** none（用户未指定执行方式，但历史偏好"别搞太复杂"+多次强调直接提交不搞 PR）
**Decision:** Inline 顺序执行
**Reasoning:** 5 个 Task 严格顺序依赖（类型→算法→视觉→状态→验证），subagent 并行无收益且审美/数据契约耦合需顺序保证一致性。用户反复强调"别搞太复杂"，inline 顺序执行最简，每个 Task 后即提交，不搞 PR。历史记忆 [[no-pr-direct-commit]] 明确要求直接 commit+push。

**Auto-invoking:** 直接 inline 顺序执行 Task 1→2→3→4→5
