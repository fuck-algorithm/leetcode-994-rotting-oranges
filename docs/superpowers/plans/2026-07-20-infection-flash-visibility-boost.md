# Infection Flash Visibility Boost Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 增强感染闪烁动画的可见性，让用户更容易"意识到这些是即将被感染的橘子"——当前闪烁已在 INFECT step 工作（CDP 验证 computedAnimation=infectionFlash，37 格同闪），但 0.5s 周期 + 仅 fill 切换易被忽略，需叠加图标缩放与色差强化。

**Architecture:** 数据流：INFECT step 的 `pendingInfect: Cell[]`（已就绪，types.ts:61）→ GridVisualizer 对 pendingInfect 格子的 `<rect>` 注入 `infectionFlash`（fill 橙褐切换，已工作）+ 本次新增对 `<text>🍊` 图标注入 `infectionPulse`（缩放呼吸，当前 keyframes 已定义但未引用，属死代码激活）+ 闪烁周期 0.5s→0.7s 降低察觉门槛。复用既有 CSS animation 模式，元素随 d3 全量重绘销毁无残留。CDP（Node WebSocket + Runtime.evaluate）驱动到 INFECT step 断言 computedAnimationName 含 infectionFlash 且 computedFill 在橙褐间切换。

**Tech Stack:** React 18.3, TypeScript 5.6 (strict/noUnusedLocals), Vite 5.4, Vitest 2.1, D3 7.9, chromium headless CDP

**Risks:**
- R1 闪烁过强引发光敏不适 → 缓解：周期 0.7s≈1.43Hz，远低于 3Hz 安全阈值；只加色差与缩放，不增加亮度
- R2 SVG `<text>` transform 缩放定位偏移 → 缓解：`transform-box: fill-box; transform-origin: center` 绕自身中心缩放
- R3 0.7s 周期与进度条 thumbGlow 1.8s 节奏不冲突 → 缓解：两者作用对象不同（rect vs div），互不干扰

---

### Task 1: 启用 infectionPulse — 给 pendingInfect 格子的 🍐 图标加缩放呼吸

**Depends on:** None
**Files:**
- Modify: `src/components/GridVisualizer.tsx:96-102`（🍊 text 元素叠加 infectionPulse）
- Test: `src/components/components.test.ts`（无需新增，既有渲染测试覆盖）

- [ ] **Step 1: 修改 infectionPulse keyframes — 用 transform scale 配合 transform-box 绕中心缩放**
文件: `src/index.css:27-30`（替换 infectionPulse 定义）

```css
/* 感染格子内橘子图标的缩放呼吸，强化"即将变化"的视觉提示。
   transform-box: fill-box 让 SVG <text> 绕自身中心缩放，避免位移。 */
@keyframes infectionPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.25); }
}
```

- [ ] **Step 2: 给 pendingInfect 格子的 🍊 text 注入 infectionPulse — 叠加缩放呼吸强化可见性**
文件: `src/components/GridVisualizer.tsx:96-102`（替换 cells.filter(d => d.state !== EMPTY).append('text')... 块）

```typescript
    cells.filter(d => d.state !== CellState.EMPTY)
      .append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + cellSize * 0.14)
      .attr('text-anchor', 'middle')
      .attr('font-size', cellSize * 0.4)
      .text('🍊')
      .style('transform-box', 'fill-box')
      .style('transform-origin', 'center')
      .style('animation', d => {
        // 即将被感染的格子，🍊 图标缩放呼吸，与 rect 的 infectionFlash 叠加，
        // 让用户从"颜色闪烁 + 图标缩放"双重信号意识到"这些是即将被感染的橘子"
        if (pendingInfect && pendingInfect.some(c => c.row === d.r && c.col === d.c)) {
          return 'infectionPulse 0.7s ease-in-out infinite';
        }
        return 'none';
      });
```

- [ ] **Step 3: 验证渲染层 — tsc 通过且既有 39 测试不回归**
Run: `npx tsc --noEmit && npx vitest run`
Expected:
  - Exit code: 0
  - Output contains: "39 passed"
  - Output does NOT contain: "error TS" or "FAIL"

- [ ] **Step 4: 提交**
Run: `git add src/components/GridVisualizer.tsx src/index.css && git commit -m "feat(canvas): pulse pending-infect orange icons with scale to boost flash visibility"`

---

### Task 2: 调整 infectionFlash 周期与色差 — 降低察觉门槛、加大对比

**Depends on:** Task 1
**Files:**
- Modify: `src/index.css:21-25`（infectionFlash keyframes）
- Modify: `src/components/GridVisualizer.tsx:87-94`（rect animation 周期 0.5s→0.7s）

- [ ] **Step 1: 调整 infectionFlash keyframes — 拉大橙褐对比、周期与图标呼吸同步**
文件: `src/index.css:21-25`（替换 infectionFlash 定义）

```css
/* 感染闪烁动画：本轮即将被感染的橘子在 FRESH 橙色与 ROTTEN 深褐之间循环切换，
   让用户意识到"这些是即将被感染的橘子"。周期 0.7s≈1.43Hz，低于 3Hz 光敏安全阈值。
   褐褐用更深色 #7c2d12（与正常腐烂格一致），让橙↔褐切换对比更鲜明。 */
@keyframes infectionFlash {
  0%, 100% { fill: #f97316; }
  50% { fill: #7c2d12; }
}
```

- [ ] **Step 2: 同步 rect 闪烁周期到 0.7s — 与图标呼吸节奏一致**
文件: `src/components/GridVisualizer.tsx:87-94`（替换 .style('animation', ...) 块）

```typescript
      .style('animation', d => {
        // 仅 INFECT step 的"即将被感染"格子闪烁；用 CSS animation 而非 d3 transition，
        // 元素随 step 切换全量重绘时一并销毁，无残留定时器。
        // 周期 0.7s 与 🍊 图标的 infectionPulse 同步，双重视觉信号。
        if (pendingInfect && pendingInfect.some(c => c.row === d.r && c.col === d.c)) {
          return 'infectionFlash 0.7s ease-in-out infinite';
        }
        return 'none';
      });
```

- [ ] **Step 3: 验证周期调整 — tsc 与测试通过**
Run: `npx tsc --noEmit && npx vitest run`
Expected:
  - Exit code: 0
  - Output contains: "39 passed"
  - Output does NOT contain: "error TS" or "FAIL"

- [ ] **Step 4: 提交**
Run: `git add src/index.css src/components/GridVisualizer.tsx && git commit -m "style(canvas): slow infection flash to 0.7s and deepen fresh/rotten contrast for visibility"`

---

### Task 3: 端到端 CDP 验证 — 确认闪烁在 INFECT step 真实渲染 + 构建推送

**Depends on:** Task 1, Task 2
**Files:**
- 无（仅运行验证命令 + 推送）

- [ ] **Step 1: 生产构建 — 确认 keyframes 保留**
Run: `npm run build`
Expected:
  - Exit code: 0
  - Output contains: "built in"
  - Output does NOT contain: "error"

- [ ] **Step 2: 验证构建产物含 infectionFlash + infectionPulse + 周期 0.7s**
Run: `grep -o "infectionFlash 0.7s\|infectionPulse 0.7s" dist/assets/*.css dist/assets/*.js | sort -u`
Expected:
  - Exit code: 0
  - Output contains: "infectionFlash 0.7s" and "infectionPulse 0.7s"

- [ ] **Step 3: CDP 驱动到 INFECT step — 断言 rect 与 text 的 computedAnimation 含 infectionFlash/infectionPulse**
Run: `node /tmp/cdp-verify.mjs`（脚本：启动 chromium 9225 端口，WebSocket 走 CDP，点重置→逐步推进，对每个 step 取 styled rect 的 getComputedStyle.animationName，断言至少一个 step 出现 "infectionFlash"，且该 step 的 🍐 text 出现 "infectionPulse"）
Expected:
  - Exit code: 0
  - 输出含 "infectionFlash 步骤数: N" 且 N > 0
  - 输出含 "infectionPulse 步骤数: M" 且 M > 0

- [ ] **Step 4: 推送触发部署**
Run: `git push origin feat/adaptive-canvas-debug-mode`
Expected:
  - Exit code: 0
  - Output contains: "github.com"
  - Output does NOT contain: "rejected"

- [ ] **Step 5: 等待部署后线上复核 — 确认线上 JS/CSS hash 更新且含新周期**
Run: `curl -s https://fuck-algorithm.github.io/leetcode-994-rotting-oranges/ | grep -oE "assets/index-[^\"]+\.(js|css)" | sort -u`（等待 60s 后执行）
Expected:
  - 输出两个 hash 与本地 dist/assets/ 一致（部署成功）
