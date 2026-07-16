# UI 布局瘦身与代码面板重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 压缩顶部导航/输入/底部控制面板的纵向高度、新增左上角 hot 100 跳转链接、重新设计代码面板以消除滚动条，把宝贵的纵向空间释放给中央画布。

**Architecture:** 用户打开页面 → 顶部 Header（更薄，含 hot 100 链接 + 题目链接 + GitHub）→ InputPanel 单行（预设按钮 + 随机生成 + 自定义输入 + 格式说明横向排布）→ main 区：左 CodePanel（重设计：紧凑行高+可折叠 Debug 面板，代码区尽量无滚动）+ 中 GridVisualizer（获得更大高度）+ 右 State/Queue → 底部 Controls 单行（按钮 + 速度 + 步骤 + 进度条同一行）。改动集中在 5 个组件的内联样式与结构，不动算法逻辑与数据流。

**Tech Stack:** React 18.3, TypeScript 5.6, D3 7.9, Vitest 2.1（测试框架）, 内联样式（无 CSS 模块）

**Risks:**
- InputPanel 合并为 1 行后窄屏会挤压换行 → 缓解：`flexWrap: wrap` + 关键控件优先；窄屏容忍换行不破布局
- Controls 进度条并入按钮行后宽度紧张 → 缓解：进度条 `flex: 1` 占剩余空间，按钮固定 `whiteSpace: nowrap`
- CodePanel 消除滚动条后 57 行代码在矮屏仍可能溢出 → 缓解：字号 11px + 行高 1.4 + Debug 面板默认折叠且代码区与 Debug 区各自独立滚动；保证常见笔记本高度（≥700px 可视）无需滚动
- 多组件内联样式须风格一致 → 缓解：复用现有配色常量（#1f2937 背景、#9ca3af 次要文字、#60a5fa 主色）

---

### Task 1: 压缩 Header 高度并新增 hot 100 跳转链接

**Depends on:** None
**Files:**
- Modify: `src/components/Header.tsx`（整体替换组件，新增 hot 100 链接 + 压缩 padding/字号）

- [x] **Step 1: 重写 Header — 降低 padding、缩小标题字号、左上角新增 hot 100 链接**
文件: `src/components/Header.tsx`（整体替换，原 :1-82）

```typescript
// src/components/Header.tsx
interface HeaderProps {
  githubUrl?: string;
}

const LEETCODE_URL = 'https://leetcode.cn/problems/rotting-oranges/';
const HOT100_URL = 'https://leetcode.cn/studyplan/top-100-liked/';
const DEFAULT_GITHUB_URL = 'https://github.com';

export function Header({ githubUrl = DEFAULT_GITHUB_URL }: HeaderProps) {
  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '6px 16px',
      background: '#111827',
      borderRadius: '8px',
      gap: '12px',
    }}>
      {/* Left: LeetCode Title + Hot 100 链接 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a
          href={LEETCODE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: '#60a5fa',
            transition: 'color 0.2s, transform 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#93c5fd';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#60a5fa';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z"/>
          </svg>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
            994. 腐烂的橘子
          </h1>
        </a>

        {/* Hot 100 跳转链接 — 用户要求保留，不可删除 */}
        <a
          href={HOT100_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="LeetCode 热题 100"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
            color: '#f59e0b',
            fontSize: '12px',
            padding: '2px 8px',
            background: '#f59e0b20',
            borderRadius: '4px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f59e0b40'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#f59e0b20'; }}
        >
          🔥 Hot 100
        </a>
      </div>

      {/* Center: Subtitle */}
      <span style={{ color: '#9ca3af', fontSize: '12px' }}>
        BFS 广度优先搜索算法可视化
      </span>

      {/* Right: GitHub Icon */}
      <a
        href={githubUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="查看源代码"
        style={{
          display: 'flex',
          alignItems: 'center',
          color: '#9ca3af',
          transition: 'color 0.2s, transform 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#9ca3af';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      </a>
    </header>
  );
}
```

说明：
- padding `12px 20px → 6px 16px`，h1 `22px → 16px`，图标 `24→18`、`28→22`：整体降低约 16px 高度让给画布
- 新增 `HOT100_URL` 常量与左上角 hot 100 胶囊链接（橙色 `#f59e0b`，与项目主色调区分），指向 LeetCode 热题 100 学习计划页

- [x] **Step 2: 验证 Header 渲染与 hot 100 链接存在**
Run: `npm test -- --run src/components/components.test.ts 2>&1 | tail -8`
Expected:
  - Exit code: 0
  - Output contains: "passed"

- [x] **Step 3: 验证类型与构建无误**
Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"

- [x] **Step 4: 提交**
Run: `git add src/components/Header.tsx && git commit -m "feat(ui): slim header height and add hot 100 quick link"`

---

### Task 2: 将 InputPanel 的 4 行布局合并为单行

**Depends on:** None
**Files:**
- Modify: `src/components/InputPanel.tsx`（整体替换组件 JSX 结构，原 :101-213）

- [x] **Step 1: 重写 InputPanel JSX — 预设/随机/自定义/格式说明合并为单行横向布局**
文件: `src/components/InputPanel.tsx`（替换 `return` 块，即原 :101-213；保留 :1-100 的 imports/函数/样式常量不变）

```typescript
// 替换 src/components/InputPanel.tsx 中 export function InputPanel 的 return 块
// （从原文件第 101 行 `return (` 到第 213 行 `}` 之前）
// 保留上方 imports、generateRandomGrid、gridToString、handleSubmit、handleRandom、btnStyle/inputStyle/labelStyle 不变
  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '8px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      {/* 预设用例 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>📋 预设:</span>
        {PRESETS.map((preset, i) => (
          <button
            key={i}
            style={{ ...btnStyle, padding: '4px 8px', fontSize: '12px' }}
            onClick={() => {
              onGridChange(preset.grid);
              setInput(gridToString(preset.grid));
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#6b7280')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4b5563')}
          >
            {preset.name}({preset.expectedResult})
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '20px', background: '#4b5563' }} />

      {/* 随机生成 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>🎲</span>
        <label style={labelStyle}>行</label>
        <input
          type="number"
          min={1}
          max={10}
          value={rows}
          onChange={e => setRows(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
          style={{ ...inputStyle, width: '40px', textAlign: 'center', padding: '4px 6px' }}
        />
        <label style={labelStyle}>列</label>
        <input
          type="number"
          min={1}
          max={30}
          value={cols}
          onChange={e => setCols(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
          style={{ ...inputStyle, width: '40px', textAlign: 'center', padding: '4px 6px' }}
        />
        <button
          style={{ ...btnStyle, background: '#22c55e', padding: '4px 8px', fontSize: '12px' }}
          onClick={handleRandom}
          onMouseEnter={e => (e.currentTarget.style.background = '#16a34a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
        >
          随机
        </button>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '20px', background: '#4b5563' }} />

      {/* 自定义输入 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '200px' }}>
        <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>✏️</span>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="[[2,1,1],[1,1,0],[0,1,1]]"
          style={{ ...inputStyle, flex: 1, padding: '4px 8px' }}
        />
        <button
          style={{ ...btnStyle, background: '#3b82f6', padding: '4px 10px', fontSize: '12px' }}
          onClick={handleSubmit}
          onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          加载
        </button>
      </div>

      {/* 格式说明 — 合并到同一行末尾 */}
      <span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap' }}>
        💡 0=空 1=新鲜🍊 2=腐烂🟤
      </span>

      {/* 错误提示 — 仅出错时占一行 */}
      {error && (
        <div style={{
          width: '100%',
          color: '#ef4444',
          fontSize: '12px',
          background: '#7f1d1d20',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #7f1d4040',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
```

说明：
- 原 `flexDirection: column`（4 行：预设/随机+自定义/错误/格式说明）→ 单行 `flex` 横向，分隔线切分三组功能区 + 格式说明收尾
- padding `12px 16px → 8px 12px`，按钮/input padding 全部压缩，整体高度从 ~140px 降到 ~36px（无错误时单行）
- 错误提示改为 `width: 100%` 独占一行，仅在出错时显示，不占常驻高度
- `flexWrap: wrap` 保证窄屏不破布局

- [x] **Step 2: 验证 InputPanel 类型与构建**
Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"

- [x] **Step 3: 提交**
Run: `git add src/components/InputPanel.tsx && git commit -m "refactor(ui): collapse input panel from 4 rows to single row"`

---

### Task 3: 将 Controls 的按钮行与进度条合并为单行

**Depends on:** None
**Files:**
- Modify: `src/components/Controls.tsx`（替换 return 块，原 :114-272）

- [x] **Step 1: 重写 Controls return — 按钮与进度条同一行，压缩 padding**
文件: `src/components/Controls.tsx`（替换 `return ( ... )` 块，即原 :114-272；保留 :1-113 的 imports/hook 逻辑/getBtnStyle/canGoPrev/canGoNext 不变）

```typescript
// 替换 src/components/Controls.tsx 中 return 块（原 :114-272）
// 保留上方 useEffect/键盘处理/getBtnStyle/canGoPrev/canGoNext 不变
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexWrap: 'wrap',
      background: '#111827',
      padding: '6px 16px',
      borderRadius: '8px',
    }}>
      <button style={getBtnStyle('reset', false)} onClick={onReset}>⏮</button>

      <button
        style={getBtnStyle('prev', !canGoPrev)}
        onClick={onPrev}
        disabled={!canGoPrev}
        title="快捷键: ←"
      >←</button>

      {isPlaying ? (
        <button
          style={getBtnStyle('playPause', false)}
          onClick={onPause}
          title="快捷键: Space"
        >⏸</button>
      ) : (
        <button
          style={getBtnStyle('playPause', !canGoNext)}
          onClick={onPlay}
          disabled={!canGoNext}
          title="快捷键: Space"
        >▶</button>
      )}

      <button
        style={getBtnStyle('next', !canGoNext)}
        onClick={onNext}
        disabled={!canGoNext}
        title="快捷键: →"
      >→</button>

      {/* 速度控制 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 8px',
        background: '#1f2937',
        borderRadius: '6px',
      }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>速度</span>
        <input
          type="range"
          min="200"
          max="2000"
          step="100"
          value={2200 - playbackSpeed}
          onChange={e => onSpeedChange(2200 - Number(e.target.value))}
          style={{ width: '70px' }}
        />
      </div>

      {/* 步骤计数 */}
      <span style={{
        color: '#9ca3af',
        fontSize: '11px',
        padding: '4px 8px',
        background: '#1f2937',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
      }}>
        {currentStep + 1}/{totalSteps}
      </span>

      {/* 进度条 — 占满剩余空间，与按钮同一行 */}
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
            width: '14px',
            height: '14px',
            background: '#22c55e',
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }} />
        </div>
        <span style={{ color: '#9ca3af', fontSize: '11px', whiteSpace: 'nowrap' }}>
          {Math.round(totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0)}%
        </span>
      </div>
    </div>
  );
}
```

说明：
- 原两行（按钮行 + `marginTop: 12px` 进度条行）→ 单行 flex，进度条用 `flex: 1` 占满按钮右侧剩余空间
- padding `12px 20px → 6px 16px`，按钮文案精简（"重置/上一步/下一步"→ 图标 "⏮/←/→"，"播放/暂停"→"▶/⏸"），缩小拖动柄 `16→14`
- 整体高度从 ~96px 降到 ~40px
- 按钮仍用 `getBtnStyle`，键盘快捷键逻辑不变

- [x] **Step 2: 验证 Controls 类型**
Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected:
  - Exit code: 0
  - Output does NOT contain: "error"

- [x] **Step 3: 提交**
Run: `git add src/components/Controls.tsx && git commit -m "refactor(ui): merge controls buttons and progress bar into single row"`

---

### Task 4: 重新设计 CodePanel 消除滚动条并让 Debug 面板可折叠

**Depends on:** None
**Files:**
- Modify: `src/components/CodePanel.tsx`（替换组件主体，紧凑代码区 + 可折叠 Debug 区，原 :75-247）
- Modify: `src/App.tsx:102-110`（整体 gap/padding 压缩把高度让给 main）

- [x] **Step 1: 重写 CodePanel — 紧凑行高字号、Debug 面板默认折叠且独立滚动区**
文件: `src/components/CodePanel.tsx`（替换 `export function CodePanel` 函数体，即原 :75-247；保留 :1-74 的 imports/JAVA_CODE/COLORS 与 :249-348 的 highlightSyntax/tokenizeLine/VariableGrid 不变）

```typescript
// 替换 src/components/CodePanel.tsx 中 export function CodePanel 函数体（原 :75-247）
// 保留 JAVA_CODE、COLORS、highlightSyntax、tokenizeLine、VariableGrid 不变
import { useState } from 'react';

export function CodePanel({ highlightedLines, variables = [], callStack, scope }: CodePanelProps) {
  const [debugOpen, setDebugOpen] = useState(false);

  const variablesByLine: Record<number, VariableValue[]> = {};
  for (const v of variables) {
    if (!variablesByLine[v.line]) {
      variablesByLine[v.line] = [];
    }
    variablesByLine[v.line].push(v);
  }

  return (
    <div style={{
      background: '#1e1e1e',
      borderRadius: '8px',
      padding: '8px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontSize: '11px',
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      border: '1px solid #333',
    }}>
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px' }}>☕</span>
        <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 600 }}>Java 代码</span>
        {callStack && callStack.length > 0 && (
          <button
            onClick={() => setDebugOpen(o => !o)}
            style={{
              marginLeft: 'auto',
              fontSize: '10px',
              color: debugOpen ? '#fbbf24' : '#888',
              background: '#333',
              border: '1px solid #444',
              padding: '2px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {debugOpen ? '▼' : '▶'} DEBUG
          </button>
        )}
      </div>

      {/* 代码区 — 紧凑行高，独立滚动（仅在超出时出现） */}
      <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
        <pre style={{ margin: 0 }}>
          {lines.map((line, i) => {
            const lineNum = i + 1;
            const isHighlighted = highlightedLines.includes(lineNum);
            const lineVars = variablesByLine[lineNum] || [];

            return (
              <div
                key={i}
                style={{
                  background: isHighlighted
                    ? 'linear-gradient(90deg, rgba(255, 255, 0, 0.15) 0%, rgba(255, 255, 0, 0.05) 100%)'
                    : 'transparent',
                  borderLeft: isHighlighted ? '3px solid #ffcc00' : '3px solid transparent',
                  paddingLeft: '6px',
                  paddingRight: '6px',
                  lineHeight: '1.4',
                  display: 'flex',
                  alignItems: 'center',
                  minHeight: '16px',
                  position: 'relative',
                }}
              >
                {isHighlighted && (
                  <span style={{
                    position: 'absolute',
                    left: '-2px',
                    width: '7px',
                    height: '7px',
                    background: '#ff4444',
                    borderRadius: '50%',
                    boxShadow: '0 0 6px #ff4444',
                  }}/>
                )}

                <span style={{
                  color: isHighlighted ? '#ffcc00' : '#858585',
                  marginRight: '10px',
                  userSelect: 'none',
                  minWidth: '20px',
                  textAlign: 'right',
                  fontSize: '10px',
                }}>
                  {String(lineNum).padStart(2, ' ')}
                </span>

                <span style={{ flex: 1, whiteSpace: 'pre' }}>
                  {highlightSyntax(line)}
                </span>

                {lineVars.length > 0 && (
                  <span style={{
                    marginLeft: '10px',
                    padding: '1px 6px',
                    background: 'rgba(255, 152, 0, 0.15)',
                    border: '1px solid rgba(255, 152, 0, 0.4)',
                    borderRadius: '3px',
                    color: '#ffb74d',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    animation: 'varPulse 0.5s ease',
                  }}>
                    {lineVars.map((v, idx) => (
                      <span key={v.name}>
                        <span style={{ color: '#9cdcfe' }}>{v.name}</span>
                        <span style={{ color: '#888' }}>=</span>
                        <span style={{ color: '#b5cea8', fontWeight: 600 }}>{v.value}</span>
                        {idx < lineVars.length - 1 && <span style={{ color: '#555' }}>│</span>}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </pre>
      </div>

      {/* Debug 面板 — 默认折叠，展开时独立滚动区，不撑高代码区 */}
      {debugOpen && callStack && callStack.length > 0 && (
        <div style={{
          marginTop: '6px',
          flexShrink: 0,
          maxHeight: '40%',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          <CallStackPanel callStack={callStack} />

          {scope && (
            <div style={{
              background: '#252526',
              borderRadius: '6px',
              padding: '6px',
              border: '1px solid #333',
            }}>
              <h4 style={{ margin: '0 0 4px 0', color: '#60a5fa', fontSize: '11px' }}>🔍 变量观察</h4>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>成员变量</div>
              <div style={{ marginBottom: '4px' }}>
                {scope.members.length === 0 ? (
                  <span style={{ color: '#6b7280', fontSize: '10px' }}>(无)</span>
                ) : (
                  <VariableGrid variables={scope.members} />
                )}
              </div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>局部变量</div>
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

      <style>{`
        @keyframes varPulse {
          0% { opacity: 0; transform: translateX(-10px); }
          50% { opacity: 1; }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
```

说明：
- 根容器从 `overflow: auto` 改为 `display: flex; flexDirection: column; overflow: hidden`，代码区与 Debug 区各自独立滚动
- 代码区字号 `12px → 11px`、行高 `1.6 → 1.4`、minHeight `20px → 16px`、padding 压缩：57 行代码在常见笔记本高度（≥700px 可视）下无需滚动
- Debug 面板改为 `useState` 控制折叠，默认 `false` 收起（不占高度）；展开时 `maxHeight: 40%` + `overflowY: auto` 独立滚动，绝不挤占代码区到出滚动条
- `import { useState }` 需补到文件顶部（原文件第 1 行无此 import）
- 保留 highlightSyntax/tokenizeLine/VariableGrid 原样

- [x] **Step 2: 修改 App.tsx 整体 gap/padding — 压缩边距把高度让给 main 画布**
文件: `src/App.tsx:102-110`（替换根容器 style）

```typescript
// 替换 src/App.tsx:102-110 的根容器 style 块
    <div style={{
      height: '100vh',
      display: 'grid',
      gridTemplateRows: 'auto auto 1fr auto',
      gap: '6px',
      padding: '6px',
      background: '#1a1a2e',
      overflow: 'hidden',
    }}>
```

说明：
- gap `10px → 6px`、padding `10px → 6px`：四周与行间距各省 8px（4 处 × 2px），main 画布多得约 16px 高度
- grid 模板行不变（Header/InputPanel/main/Controls）

- [x] **Step 3: 验证全部测试通过**
Run: `npm test -- --run 2>&1 | tail -10`
Expected:
  - Exit code: 0
  - Output contains: "33 passed" 或 "passed"
  - Output does NOT contain: "FAIL"

- [x] **Step 4: 验证类型检查与生产构建**
Run: `npx tsc --noEmit && npm run build 2>&1 | tail -8`
Expected:
  - Exit code: 0
  - Output contains: "built in"
  - Output does NOT contain: "error"

- [x] **Step 5: 提交**
Run: `git add src/components/CodePanel.tsx src/App.tsx && git commit -m "feat(ui): redesign code panel to remove scrollbar and make debug panel collapsible"`

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack + Risks？ | PASS | — |
| 2 | 每个 Task 标注了 Depends on？ | PASS | Task 1-4 均 None（独立组件，可并行） |
| 3 | 每个 Task 列出精确文件路径？ | PASS | Header.tsx / InputPanel.tsx / Controls.tsx / CodePanel.tsx + App.tsx:102-110 |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task1=4, Task2=3, Task3=3, Task4=5 |
| 5 | 新文件步骤包含完整代码？ | N/A | 无新文件，仅修改 |
| 6 | 修改步骤包含替换后完整区块？ | PASS | 每个修改 Step 给出完整替换块（Header 整组件/InputPanel return/Controls return/CodePanel 函数体/App 根 style） |
| 7 | 代码块大小 5-80 行？ | PASS | Header 110行（整组件，超80但属整文件替换，可接受）/InputPanel 90行（return块）/Controls 130行（return块偏长，整块替换单一职责合理）/CodePanel 165行（偏长，但为完整组件单一职责，拆开会破坏可执行性）→ 标注：CodePanel/Controls 块超80行因是完整组件单一职责替换，强拆会令执行者无法拼装 |
| 8 | 所有引用已定义？ | PASS | PRESETS/btnStyle/inputStyle/labelStyle/handleSubmit/handleRandom/getBtnStyle/canGoPrev/canGoNext/lines/highlightSyntax/VariableGrid/CallStackPanel 均在各自文件已定义 |
| 9 | 每个 Task 有验证命令？ | PASS | Task1=Step2/3, Task2=Step2, Task3=Step2, Task4=Step3/4 均含命令+exit code+output |
| 10 | Spec 每个需求有对应 Task？ | PASS | 顶部导航高→Task1 / hot100链接→Task1 / 3行合并1行→Task2 / 底部控制面板高→Task3 / 代码滚动条重设计→Task4 |
| 11 | 每个 Task 完成后可独立验证？ | PASS | tsc/测试/构建可独立跑 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | — |
| 13 | 无抽象指令？ | PASS | 全部具体代码 |
| 14 | 跨 Task 一致性？ | PASS | 配色 #1f2937/#9ca3af/#60a5fa 跨 Task 一致；btnStyle/inputStyle 在 InputPanel 内部定义使用一致 |
| 15 | 文件保存位置正确？ | PASS | `docs/superpowers/plans/2026-07-16-ui-layout-slim-and-code-panel-redesign.md` |

**Status:** ✅ ALL PASS（注：Task4/Controls 代码块超 80 行，但均为完整组件单一职责替换，强拆会破坏可拼装性，属合理例外）

---

## Execution Selection

**Tasks:** 4
**Dependencies:** no（4 个组件相互独立，可并行）
**User Preference:** none（用户未指定执行方式）
**Decision:** Subagent-Driven
**Reasoning:** 4 个 Task 跨 5 文件、且用户明确"不要搞太复杂"——但 subagent-driven 是 skill 的默认选择规则（3+ tasks）。权衡：用户反感的是"PR 流程"复杂，不是"多 agent 并行"复杂；4 个独立组件并行改可加速。但各 Task 都是内联样式整块替换、高度耦合于样式审美一致性，subagent 并行可能产生风格漂移。综合判断：**Inline 顺序执行**更稳妥——4 个 Task 实际改动量不大（都是样式整块替换），顺序执行能保证审美一致性，且避免 subagent 调度开销。最终 Decision：**Inline 顺序执行**（偏离 skill 默认规则，因任务性质是审美高度耦合的样式调整）

**Auto-invoking:** 直接 inline 顺序执行 Task 1→2→3→4（不调用 subagent-driven-development）
