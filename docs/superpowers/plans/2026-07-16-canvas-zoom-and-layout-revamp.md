# 画布缩放拖动 + 面板重新排版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 让中央画布支持鼠标滚轮缩放与拖拽平移；重新排版三栏比例与各面板，让代码/调试/状态等重要内容完整展示，不再被压扁。

**Architecture:** 用户滚轮/拖拽 → d3.zoom 行为作用于 GridVisualizer 的 svg 内 `<g>` 容器（transform: translate+scale）→ 画布缩放平移，cellSize 仍由 useAutoFitGrid 提供初始尺寸（zoom 是叠加变换，正交不冲突）。排版上：App.tsx main 三栏从 `1fr 2fr 1fr` 均分改为 `1fr 1.6fr 0.85fr`（加宽左侧代码面板、画布占大头、右栏紧凑），CodePanel 的 Debug 面板默认展开（调用栈/变量是核心调试信息不应藏），StatePanel 紧凑化适配窄右栏。改动集中在 4 个组件，不动算法数据流。

**Tech Stack:** React 18.3, TypeScript 5.6, D3 7.9（含 d3-zoom 子模块，已安装，无需新增依赖）, Vitest 2.1

**Risks:**
- d3.zoom 与 useAutoFitGrid 的 cellSize 冲突 → 缓解：zoom 作用于 svg 内 `<g>` transform，cellSize 决定初始布局，两者正交
- 缩放后坐标文字/橘子图标变形 → 缓解：svg 整体等比缩放，矢量文字可接受；不单独缩放文字
- 右栏改窄后 StatePanel 溢出 → 缓解：StatePanel badge 紧凑化 + 独立 overflow:auto
- 改列宽后画布在小屏被挤 → 缓解：画布列设 minWidth 300px，且 zoom 可缩小查看全局

---

### Task 1: 为 GridVisualizer 增加 d3.zoom 缩放与拖动

**Depends on:** None
**Files:**
- Modify: `src/components/GridVisualizer.tsx`（svg 加 zoom 行为，整体替换 useEffect + return，原 :31-123）

- [ ] **Step 1: 修改 GridVisualizer useEffect — 在 svg 上挂载 d3.zoom 行为**
文件: `src/components/GridVisualizer.tsx:31-116`（替换整个 useEffect 块）

```typescript
// 替换 src/components/GridVisualizer.tsx 中 useEffect 块（原 :31-116）
  useEffect(() => {
    if (!svgRef.current || !grid.length) return;

    const svg = d3.select(svgRef.current);
    const rows = grid.length;
    const cols = grid[0].length;
    const gap = 4;
    const width = cols * (cellSize + gap) - gap;
    const height = rows * (cellSize + gap) - gap;

    svg
      .attr('viewBox', `0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%')
      .attr('height: '100%');
    svg.selectAll('*').remove();

    // 根容器 <g>：所有单元格挂在此，zoom 作用于它
    const root = svg.append('g');

    const cellData = grid.flatMap((row, r) =>
      row.map((state, c) => {
        const info = cellInfoGrid?.[r]?.[c];
        return { r, c, state, infectionTime: info?.infectionTime };
      })
    );

    const cells = root.selectAll('g')
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
```

说明（本 Step 仅把所有单元格挂到新增的 `root = svg.append('g')` 下，为下一步 zoom 提供变换目标；其余绘制逻辑不变）

- [ ] **Step 2: 在 useEffect 末尾挂载 d3.zoom — 滚轮缩放、拖拽平动**
文件: `src/components/GridVisualizer.tsx`（在上一步 useEffect 内 `cells.filter(...).text('初始')` 之后、闭合 `}, [...]` 之前插入 zoom 挂载）

```typescript
    // 在 useEffect 内、绘制完单元格之后、依赖数组之前插入：
    // d3.zoom：滚轮缩放 + 拖拽平移，作用于 root <g>
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoom);
```

说明：
- `scaleExtent([0.3, 4])`：缩放范围 0.3× ~ 4×，既能缩小看全局也能放大看细节
- `zoom` 事件把 `event.transform`（含 x/y/scale）写到 root `<g>` 的 transform，所有单元格随之缩放平移
- `svg.call(zoom)` 把行为挂到 svg 元素，滚轮/拖拽均在此 svg 区域内生效
- d3-zoom 已随 d3@7.9 整包安装，`import * as d3 from 'd3'` 即可用，无需新增依赖

- [ ] **Step 3: 验证 GridVisualizer 类型与测试**
Run: `npx tsc --noEmit 2>&1 | tail -5 && npm test -- --run 2>&1 | tail -4`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"
  - Output contains: "passed"

- [ ] **Step 4: 提交**
Run: `git add src/components/GridVisualizer.tsx && git commit -m "feat(canvas): add d3 zoom and pan to grid visualizer"`

---

### Task 2: 重新排版 App.tsx 三栏比例 — 画布优先、加宽代码面板

**Depends on:** None
**Files:**
- Modify: `src/App.tsx:118-124`（main gridTemplateColumns）+ `:135-157`（画布容器 padding）

- [ ] **Step 1: 修改 main 三栏比例 — 1fr 2fr 1fr 改为 1fr 1.6fr 0.85fr，画布列设 minWidth**
文件: `src/App.tsx:118-124`（替换 main 的 style 块）

```typescript
// 替换 src/App.tsx:118-124 的 main style 块
      <main style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.6fr 0.85fr',
        gap: '6px',
        minHeight: 0,
        overflow: 'hidden',
      }}>
```

说明：
- 左侧 CodePanel `1fr` → `1fr`（保持，但相对右栏更宽了，因总比例变化后实际像素增加）
- 中间画布 `2fr` → `1.6fr`（仍占最大，但让出空间给左栏代码完整展示）
- 右栏 `1fr` → `0.85fr`（紧凑化，StatePanel/QueuePanel 适配窄空间）
- gap `10px → 6px`（与 Task4 上一轮一致，进一步省高度）

- [ ] **Step 2: 修改画布容器 — 减小 padding 给 svg 更多空间，加 minWidth 防小屏挤压**
文件: `src/App.tsx:135-157`（替换画布容器的 style 块，原 :136-150）

```typescript
// 替换 src/App.tsx 中画布容器 div 的 style（原 :136-150，ref={gridContainerRef} 那个）
        <div
          ref={gridContainerRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#111827',
            borderRadius: '8px',
            padding: '8px',
            minHeight: 0,
            minWidth: 300,
            overflow: 'hidden',
            cursor: 'grab',
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

说明：
- padding `16px → 8px`：svg 获得更多绘制空间
- 加 `minWidth: 300`：小屏下画布至少 300px，不被挤没
- 加 `cursor: 'grab'`：提示用户可拖拽（d3.zoom 拖拽时光标会变 grabbing，由 d3 自动管理）

- [ ] **Step 3: 验证类型与构建**
Run: `npx tsc --noEmit 2>&1 | tail -3`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"

- [ ] **Step 4: 提交**
Run: `git add src/App.tsx && git commit -m "refactor(ui): rebalance three-column layout to prioritize canvas and code panel"`

---

### Task 3: CodePanel Debug 面板默认展开 — 让调用栈/变量观察直接可见

**Depends on:** None
**Files:**
- Modify: `src/components/CodePanel.tsx:78`（debugOpen 初始值 false → true）

- [ ] **Step 1: 修改 debugOpen 默认值为 true — Debug 面板默认展开**
文件: `src/components/CodePanel.tsx`（替换 `const [debugOpen, setDebugOpen] = useState(false);` 一行）

```typescript
// 替换 src/components/CodePanel.tsx 中：
// const [debugOpen, setDebugOpen] = useState(false);
// 改为：
  const [debugOpen, setDebugOpen] = useState(true);
```

说明：调用栈与变量观察是核心调试信息，用户反馈"重要内容没展示好"，默认折叠导致它们被藏起来。改为默认展开，用户打开页面即可看到当前执行帧与变量。Debug 区有 `maxHeight: 40%` + 独立滚动，展开不会撑爆代码区。

- [ ] **Step 2: 验证测试与类型**
Run: `npm test -- --run 2>&1 | tail -4 && npx tsc --noEmit 2>&1 | tail -3`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "error"

- [ ] **Step 3: 提交**
Run: `git add src/components/CodePanel.tsx && git commit -m "feat(ui): default-expand debug panel to surface call stack and variables"`

---

### Task 4: StatePanel 紧凑化 — 适配窄右栏，完整展示状态

**Depends on:** None
**Files:**
- Modify: `src/components/StatePanel.tsx`（压缩 padding/字号/badge，原 :56-160）

- [ ] **Step 1: 紧凑化 StatePanel — 缩小标题/padding/badge，去掉冗余分隔**
文件: `src/components/StatePanel.tsx:56-160`（替换整个 return 块）

```typescript
// 替换 src/components/StatePanel.tsx 中 return 块（原 :56-160）
  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '8px',
      padding: '8px',
      height: '100%',
      overflow: 'auto',
    }}>
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

      {/* 单元格统计 — 紧凑 badge 横排 */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
        <StatBadge icon="⬜" label="空" value={emptyCount} color="#6b7280" />
        <StatBadge icon="🍊" label="鲜" value={freshCount} color="#f97316" />
        <StatBadge icon="🟤" label="腐" value={rottenCount} color="#92400e" />
      </div>

      {/* 感染进度 — 单行 */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '3px',
        }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>感染进度</span>
          <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px' }}>{progress}%</span>
        </div>
        <div style={{
          height: '6px',
          background: '#374151',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* 本轮感染 */}
      {infectedThisMinute > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '3px 0',
          fontSize: '12px',
        }}>
          <span>🔥 本轮感染</span>
          <span style={{
            color: '#ef4444',
            fontWeight: 'bold',
            padding: '1px 6px',
            background: '#ef444420',
            borderRadius: '3px',
          }}>
            +{infectedThisMinute}
          </span>
        </div>
      )}

      {/* 最终结果 */}
      {isComplete && (
        <div style={{
          marginTop: '6px',
          padding: '8px',
          background: result === -1 ? '#7f1d1d' : '#14532d',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', marginBottom: '2px', opacity: 0.8 }}>最终结果</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {result === -1 ? '-1 (无解)' : `${result} 分钟`}
          </div>
        </div>
      )}

      {/* 描述 */}
      <div style={{
        marginTop: '6px',
        padding: '6px',
        background: '#374151',
        borderRadius: '4px',
        fontSize: '11px',
        lineHeight: '1.4',
      }}>
        💡 {description}
      </div>
    </div>
  );
```

说明：
- padding `12px → 8px`，标题独立成行（分钟/波次移到标题右侧省一行），字号 14→13
- 单元格统计去掉"总计 N"独立行（合并到 badge），badge 间距 8→4
- 进度条高度 8→6，去掉冗余 padding
- 整体高度压缩约 30%，适配 Task2 改窄的右栏，关键状态（分钟/统计/进度/结果）全部可见

- [ ] **Step 2: 验证测试与类型**
Run: `npm test -- --run 2>&1 | tail -4 && npx tsc --noEmit 2>&1 | tail -3`
Expected:
  - Exit code: 0
  - Output contains: "passed"
  - Output does NOT contain: "error"

- [ ] **Step 3: 提交**
Run: `git add src/components/StatePanel.tsx && git commit -m "refactor(ui): compact state panel to fit narrower right column"`

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack + Risks？ | PASS | — |
| 2 | 每个 Task 标注 Depends on？ | PASS | Task 1-4 均 None（独立组件） |
| 3 | 每个 Task 列出精确文件路径？ | PASS | GridVisualizer.tsx / App.tsx:118-124+135-157 / CodePanel.tsx:78 / StatePanel.tsx:56-160 |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task1=4, Task2=4, Task3=3, Task4=3 |
| 5 | 新文件步骤包含完整代码？ | N/A | 无新文件 |
| 6 | 修改步骤包含替换后完整区块？ | PASS | GridVisualizer useEffect 完整 / App main+画布 style 完整 / CodePanel 单行 / StatePanel return 完整 |
| 7 | 代码块大小 5-80 行？ | PASS | Task1 useEffect ~85行（整块单一职责，超80但属完整 useEffect 替换）/ StatePanel return ~95行（偏长但完整组件单一职责）→ 标注：超 80 行均为完整函数/组件单一职责替换，强拆会破坏可执行性 |
| 8 | 所有引用已定义？ | PASS | d3/COLORS/isNewlyRotten/CellState/useAutoFitGrid/autoCellSize/VariableValue/CallStackPanel/VariableGrid/StatBadge 均已定义 |
| 9 | 每个 Task 有验证命令？ | PASS | 各 Task 含 tsc/test 验证 + exit code + output pattern |
| 10 | Spec 每个需求有对应 Task？ | PASS | 画布缩放拖动→Task1 / 排版重新→Task2 / 重要内容展示→Task3(Debug展开)+Task4(StatePanel紧凑) |
| 11 | 每个 Task 完成后可独立验证？ | PASS | tsc/测试可独立跑 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | — |
| 13 | 无抽象指令？ | PASS | 全部具体代码 |
| 14 | 跨 Task 一致性？ | PASS | 配色 #1f2937/#9ca3af/#60a5fa 跨 Task 一致；d3 import 方式一致 |
| 15 | 文件保存位置正确？ | PASS | `docs/superpowers/plans/2026-07-16-canvas-zoom-and-layout-revamp.md` |

**Status:** ✅ ALL PASS

---

## Execution Selection

**Tasks:** 4
**Dependencies:** no（4 个组件独立，Task1 zoom / Task2 排版 / Task3 CodePanel / Task4 StatePanel 互不依赖）
**User Preference:** none（用户未指定执行方式，但反复强调"别搞太复杂"）
**Decision:** Inline 顺序执行
**Reasoning:** 用户明确反感复杂流程（PR 那套已纠正）。4 个 Task 都是组件级样式/交互改动，审美高度耦合，inline 顺序执行能保证一致性且无调度开销。subagent 并行对样式审美一致无益。

**Auto-invoking:** 直接 inline 顺序执行 Task 1→2→3→4
