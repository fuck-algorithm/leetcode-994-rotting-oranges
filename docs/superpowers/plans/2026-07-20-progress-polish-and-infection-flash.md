# Progress Polish & Infection Flash Animation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 美化页面两处进度条（不用 HTML 原生样式），并在 INFECT 步骤对"本轮即将被感染"的橘子做 FRESH↔ROTTEN 闪烁动画，让用户直观意识到"这些是即将被感染的橘子"。

**Architecture:** 数据流：算法层 `generateSteps` 在 INFECT step 携带 `pendingInfect`（本轮新感染格子坐标，grid 已 ROTTEN，本字段标记"刚从 FRESH 变来"）→ GridVisualizer 解构 `pendingInfect`，对这些 rect 注入 CSS `animation: infectionFlash`（FRESH 橙 ↔ ROTTEN 褐循环切换，2Hz 以内安全频率），动画随 step 切换重绘销毁无残留 → 进度条美化在 StatePanel（感染进度）与 Controls（步骤进度）用自定义渐变轨道+光泽填充+发光滑块替换朴素灰底绿条，完全自绘不依赖 `<progress>` 原生样式。复用项目既有 `<style>{@keyframes}` 注入模式（见 CodePanel.tsx:251-257）与 index.css 全局样式。

**Tech Stack:** React 18.3, TypeScript 5.6 (strict/noUnusedLocals), Vite 5.4, Vitest 2.1, D3 7.9, fast-check 2.x

**Risks:**
- R1 闪烁与 d3 全量重绘冲突 → 缓解：用 SVG rect 的 CSS animation（非 d3 transition 链），元素随重绘销毁
- R2 闪烁频率无障碍 → 缓解：周期 0.5s（2Hz），低于 3Hz 光敏安全阈值，仅 INFECT step 期间运行
- R3 pendingInfect 语义易被误读 → 缓解：JSDoc 明确"感染前 FRESH，感染后 grid 已 ROTTEN，本字段仅驱动闪烁动画"
- R4 进度条美化破坏既有 onClick 跳转 + 透明 range 拖动 → 缓解：保持外层 div onClick 与透明 input 结构不变，只改视觉层
- R5 keyframes 被构建 purge → 缓解：写 index.css 全局，项目无 purge 工具

---

### Task 1: 数据层 — GridState 新增 pendingInfect 字段并注入算法层

**Depends on:** None
**Files:**
- Modify: `src/algorithm/types.ts:35-64`（GridState 接口新增字段）
- Modify: `src/algorithm/rottingOranges.ts:132-180`（createStep 签名 + 实现）
- Modify: `src/algorithm/rottingOranges.ts:388-410`（INFECT step 注入 pendingInfect）
- Test: `src/algorithm/rottingOranges.test.ts`（新增 pendingInfect 断言）

- [ ] **Step 1: 扩展 GridState 接口 — 新增 pendingInfect 字段以驱动闪烁动画**
文件: `src/algorithm/types.ts:54-58`（在 waveColor/targetCell 字段区块内新增）

```typescript
// 替换 src/algorithm/types.ts:54-58 的"新增：可读性视觉辅助字段"区块
  // ===== 新增：可读性视觉辅助字段 =====
  /** 当前 BFS 波次（分钟数）对应的色相，用于给本轮新感染的格子加色环，让用户看清"一整波同时扩散" */
  waveColor?: string;
  /** 当前正在检查/感染的目标格子（方向箭头终点），让用户眼睛知道看哪个格子 */
  targetCell?: Cell;
  /** 即将被感染（本轮新感染）的格子坐标列表。注意：此 step 的 grid 已是 ROTTEN（感染后），
   *  本字段标记"这些格子刚从 FRESH 变来"，仅用于渲染层做 FRESH↔ROTTEN 闪烁动画，让用户意识到"这些是即将被感染的橘子" */
  pendingInfect?: Cell[];
```

- [ ] **Step 2: 扩展 createStep 签名与实现 — 末尾新增 pendingInfect 参数并写入返回对象**
文件: `src/algorithm/rottingOranges.ts:132-180`（替换整个 createStep 函数）

```typescript
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
```

- [ ] **Step 3: 注入 pendingInfect 到 INFECT step — 让渲染层拿到"即将被感染"的格子列表**
文件: `src/algorithm/rottingOranges.ts:398-410`（替换 INFECT step 的 createStep 调用）

```typescript
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
```

- [ ] **Step 4: 新增 pendingInfect 断言到可读性测试 — 确保每个 INFECT step 携带 pendingInfect**
文件: `src/algorithm/rottingOranges.test.ts:207-217`（在"每个 INFECT step 都带 waveColor 和 targetCell"测试内追加断言）

```typescript
  it('每个 INFECT（整波扩散）step 都带 waveColor、targetCell 和 pendingInfect（视觉强相关）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const infectSteps = result.steps.filter(s => s.phase === AlgorithmPhase.INFECT);
    expect(infectSteps.length).toBeGreaterThan(0);
    for (const s of infectSteps) {
      expect(s.waveColor).toBeDefined();
      expect(s.targetCell).toBeDefined();
      expect(s.newlyRotten.length).toBeGreaterThan(0);
      // pendingInfect 与 newlyRotten 应一一对应（同一批格子）
      expect(s.pendingInfect).toBeDefined();
      expect(s.pendingInfect!.length).toBe(s.newlyRotten.length);
    }
  });
```

- [ ] **Step 5: 验证数据层 — tsc 与测试通过**
Run: `npx tsc --noEmit && npx vitest run src/algorithm/rottingOranges.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "16 tests" and "passed"
  - Output does NOT contain: "FAIL" or "error TS"

- [ ] **Step 6: 提交**
Run: `git add src/algorithm/types.ts src/algorithm/rottingOranges.ts src/algorithm/rottingOranges.test.ts && git commit -m "feat(algorithm): add pendingInfect field to GridState to drive infection flash animation"`

---

### Task 2: 渲染层 — GridVisualizer 感染闪烁动画

**Depends on:** Task 1
**Files:**
- Modify: `src/components/GridVisualizer.tsx:29`（解构 pendingInfect）
- Modify: `src/components/GridVisualizer.tsx:64-86`（rect 渲染：对 pendingInfect 格子注入 CSS animation）
- Modify: `src/components/GridVisualizer.tsx:169`（useEffect 依赖数组）
- Modify: `src/index.css`（末尾追加 infectionFlash keyframes）

- [ ] **Step 1: 解构 pendingInfect 字段 — 从 gridState 取出即将感染格子列表**
文件: `src/components/GridVisualizer.tsx:29`（替换解构行）

```typescript
  const { grid, cellInfoGrid, newlyRotten, currentCell, waveColor, targetCell, pendingInfect } = gridState;
```

- [ ] **Step 2: 注入全局 infectionFlash keyframes — 定义 FRESH↔ROTTEN 闪烁循环**
文件: `src/index.css`（末尾追加，不替换既有内容）

```css
/* 感染闪烁动画：本轮即将被感染的橘子在 FRESH 橙色与 ROTTEN 褐色之间循环切换，
   让用户意识到"这些是即将被感染的橘子"。周期 0.5s = 2Hz，低于 3Hz 光敏安全阈值。 */
@keyframes infectionFlash {
  0%, 100% { fill: #f97316; }
  50% { fill: #b45309; }
}

/* 感染格子内橘子图标的轻微缩放呼吸，强化"即将变化"的视觉提示 */
@keyframes infectionPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
```

- [ ] **Step 3: 对 pendingInfect 格子注入闪烁 animation — rect fill 在橙褐间循环**
文件: `src/components/GridVisualizer.tsx:64-86`（替换 cells.append('rect') 整块）

```typescript
    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', Math.max(4, cellSize * 0.12))
      .attr('fill', d => COLORS[d.state])
      .attr('stroke', d => {
        // 优先级：当前源格子 > 新感染(波次色环) > 默认透明
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
      })
      .style('animation', d => {
        // 仅 INFECT step 的"即将被感染"格子闪烁；用 CSS animation 而非 d3 transition，
        // 元素随 step 切换全量重绘时一并销毁，无残留定时器。
        if (pendingInfect && pendingInfect.some(c => c.row === d.r && c.col === d.c)) {
          return 'infectionFlash 0.5s ease-in-out infinite';
        }
        return 'none';
      });
```

- [ ] **Step 4: useEffect 依赖数组追加 pendingInfect — step 变化时正确触发重绘**
文件: `src/components/GridVisualizer.tsx:169`（替换依赖数组行）

```typescript
  }, [grid, cellInfoGrid, newlyRotten, currentCell, cellSize, showCoordinates, showInfectionTime, waveColor, targetCell, pendingInfect]);
```

- [ ] **Step 5: 验证渲染层 — tsc 通过且既有 39 测试不回归**
Run: `npx tsc --noEmit && npx vitest run`
Expected:
  - Exit code: 0
  - Output contains: "39 passed"
  - Output does NOT contain: "error TS" or "FAIL"

- [ ] **Step 6: 提交**
Run: `git add src/components/GridVisualizer.tsx src/index.css && git commit -m "feat(canvas): flash pending-infect oranges between fresh/rotten on INFECT steps for readability"`

---

### Task 3: UI 层 — 进度条美化（不用 HTML 原生样式）

**Depends on:** None（独立于 Task 1/2，纯视觉层）
**Files:**
- Modify: `src/components/StatePanel.tsx:86-111`（感染进度条美化）
- Modify: `src/components/Controls.tsx:188-257`（步骤进度条美化）
- Modify: `src/index.css`（追加进度条光泽/发光 keyframes）

- [ ] **Step 1: 追加进度条视觉 keyframes — 渐变流动与滑块发光**
文件: `src/index.css`（末尾追加，不替换既有内容）

```css
/* 进度条填充光泽流动：一道高光从左向右扫过，避免静态死板 */
@keyframes progressShine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

/* 进度条滑块持续微脉动光晕，吸引用户注意当前位置 */
@keyframes thumbGlow {
  0%, 100% { box-shadow: 0 0 4px rgba(34, 197, 94, 0.6), 0 2px 4px rgba(0,0,0,0.3); }
  50% { box-shadow: 0 0 10px rgba(34, 197, 94, 0.9), 0 2px 4px rgba(0,0,0,0.3); }
}
```

- [ ] **Step 2: 美化 StatePanel 感染进度条 — 渐变轨道+光泽流动+脉动百分比**
文件: `src/components/StatePanel.tsx:86-111`（替换感染进度区块）

```typescript
      {/* 感染进度 — 渐变轨道 + 光泽流动，自定义样式不靠原生 progress */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>感染进度</span>
          <span style={{
            color: progress === 100 ? '#22c55e' : '#fbbf24',
            fontWeight: 'bold',
            fontSize: '13px',
            textShadow: progress === 100 ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
            transition: 'all 0.3s ease',
          }}>{progress}%</span>
        </div>
        <div style={{
          position: 'relative',
          height: '8px',
          background: 'linear-gradient(90deg, #1f2937, #374151)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #f97316 0%, #f59e0b 50%, #22c55e 100%)',
            borderRadius: '4px',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 6px rgba(251, 191, 36, 0.5)',
          }}>
            {/* 光泽流动高光层 */}
            {progress > 0 && progress < 100 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                animation: 'progressShine 2s ease-in-out infinite',
              }} />
            )}
          </div>
        </div>
      </div>
```

- [ ] **Step 3: 美化 Controls 步骤进度条 — 渐变填充+发光滑块，保留点击/拖动交互**
文件: `src/components/Controls.tsx:188-257`（替换进度条区块，保持外层 onClick 与透明 range input 结构）

```typescript
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
```

- [ ] **Step 4: 验证 UI 层 — tsc 通过且组件测试不回归**
Run: `npx tsc --noEmit && npx vitest run src/components/components.test.ts`
Expected:
  - Exit code: 0
  - Output contains: "9 passed"
  - Output does NOT contain: "error TS" or "FAIL"

- [ ] **Step 5: 提交**
Run: `git add src/components/StatePanel.tsx src/components/Controls.tsx src/index.css && git commit -m "style(ui): polish progress bars with gradient track, shine flow and glowing thumb, no native style"`

---

### Task 4: 端到端验证 — 构建、量化、部署

**Depends on:** Task 1, Task 2, Task 3
**Files:**
- 无新文件（仅运行验证命令 + 推送）

- [ ] **Step 1: 全量类型检查与测试 — 确保无回归**
Run: `npx tsc --noEmit && npx vitest run`
Expected:
  - Exit code: 0
  - Output contains: "40 passed"（原 39 + Task 1 新增 1 个 pendingInfect 断言）
  - Output does NOT contain: "error TS" or "FAIL"

- [ ] **Step 2: 生产构建 — 确认 keyframes 与动画 CSS 保留**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"
  - Output does NOT contain: "error" or "Error"

- [ ] **Step 3: 验证构建产物含闪烁/进度条 keyframes — 防 purge 丢失**
Run: `grep -l "infectionFlash\|progressShine\|thumbGlow" dist/assets/*.css`
Expected:
  - Exit code: 0
  - Output contains: ".css"（至少一个 CSS 文件含这些 keyframes 名）

- [ ] **Step 4: 量化 step 数未回归 — 闪烁不影响算法粒度**
Run: `npx vite-node /tmp/step-verify.mts`（临时脚本统计 10×10 随机网格 step 数）
Expected:
  - Exit code: 0
  - 输出含 "平均" 且数值 < 20（与上次优化后 avg 11.8 一致）

- [ ] **Step 5: 推送触发部署 — 直接 commit+push，不用 PR**
Run: `git push origin feat/adaptive-canvas-debug-mode`
Expected:
  - Exit code: 0
  - Output contains: "remote" 或 "up to date" 或 "github.com"
  - Output does NOT contain: "error: failed" or "rejected"
