# GitHub Action 每次 Push 自动部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 修改 `.github/workflows/deploy.yml` 触发条件，使每次任意分支 push 代码变更时都自动触发 GitHub Pages 部署，方便随时在线上查看最新效果。

**Architecture:** 开发者在任意分支 push → GitHub 监听 push 事件触发 `deploy.yml` → build job 执行 checkout + npm ci + lint + test + build → 生成 Pages artifact → deploy job 部署到 GitHub Pages。改动点仅为 `on:` 触发条件块，从限定 `branches: [main]` 改为不限分支（所有 push 都触发）。复用现有 build/deploy 流水线与权限配置，不改 Vite base 路径（仍为 `/leetcode-994-rotting-oranges/`）。

**Tech Stack:** GitHub Actions, actions/checkout@v4, actions/setup-node@v4, actions/configure-pages@v4, actions/upload-pages-artifact@v3, actions/deploy-pages@v4

**Risks:**
- feature 分支半成品会临时覆盖正式 Pages 站点 → 缓解：用户已明确选择此方案，接受临时覆盖；main 分支 push 后自动恢复正式版本
- 并发部署冲突 → 缓解：现有 `concurrency.group: "pages"` + `cancel-in-progress: false` 会串行化部署，避免冲突
- `workflow_dispatch` 手动触发保留 → 缓解：触发条件中保留 `workflow_dispatch`，方便手动重跑

---

### Task 1: 扩展 deploy.yml 触发条件为每次 push 部署

**Depends on:** None
**Files:**
- Modify: `.github/workflows/deploy.yml:3-6`

- [ ] **Step 1: 修改触发条件块 — 从仅 main 改为所有分支 push**
文件: `.github/workflows/deploy.yml:3-6`（替换 `on:` 整块）

```yaml
# 替换 .github/workflows/deploy.yml:3-6 的触发条件块
on:
  push:
    # 监听所有分支的 push，每次代码变更都触发部署
    branches-ignore:
      - 'gh-pages'
  workflow_dispatch:
```

说明：
- 使用 `branches-ignore: [gh-pages]` 而非空 `branches: []`，避免触发部署产物分支自身导致循环；同时保留所有真实开发分支（main、feat/* 等）的 push 触发
- 保留 `workflow_dispatch` 用于手动触发
- 其余 job（build / deploy）、permissions、concurrency 全部不变

- [ ] **Step 2: 验证 workflow YAML 语法**
Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('YAML valid')"`
Expected:
  - Exit code: 0
  - Output contains: "YAML valid"

- [ ] **Step 3: 验证触发条件语义 — 确认 push 块不限单一分支**
Run: `grep -A4 '^on:' .github/workflows/deploy.yml`
Expected:
  - Exit code: 0
  - Output contains: "branches-ignore"
  - Output does NOT contain: "branches: [main]"

- [ ] **Step 4: 提交并推送 — 触发首次全分支部署**
Run: `git add .github/workflows/deploy.yml && git commit -m "ci: deploy github pages on every push to any branch" && git push`
Expected:
  - Exit code: 0
  - Output contains: "To github.com"

- [ ] **Step 5: 验证 GitHub Action 被触发并成功**
Run: `sleep 10 && gh run list --workflow=deploy.yml --limit 1 --json status,conclusion,headBranch,event`
Expected:
  - Exit code: 0
  - Output contains: `"headBranch":"feat/adaptive-canvas-debug-mode"` 或当前分支名
  - Output contains: `"event":"push"`
  - conclusion 字段为 `"success"` 或 `"in_progress"`（若仍在跑）

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack + Risks？ | PASS | — |
| 2 | 每个 Task 标注了 Depends on？ | PASS | Task 1 = None（单任务） |
| 3 | 每个 Task 列出精确文件路径？ | PASS | `.github/workflows/deploy.yml:3-6` |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task 1 = 5 Step |
| 5 | 新文件步骤包含完整代码？ | N/A | 无新文件，仅修改 |
| 6 | 修改步骤包含替换后完整区块？ | PASS | `on:` 块完整给出 |
| 7 | 代码块大小 5-80 行？ | PASS | YAML 块 6 行 |
| 8 | 所有引用已定义？ | PASS | 无悬空引用 |
| 9 | 每个 Task 有验证命令（命令+exit code+output）？ | PASS | Step 2/3/5 均含 |
| 10 | Spec 每个需求有对应 Task？ | PASS | "每次提交触发部署" → Task 1 |
| 11 | 每个 Task 完成后可独立验证？ | PASS | Step 5 用 gh run list 验证实际触发 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | — |
| 13 | 无抽象指令？ | PASS | — |
| 14 | 跨 Task 一致性？ | N/A | 单 Task |
| 15 | 文件保存位置正确？ | PASS | `docs/superpowers/plans/2026-07-15-deploy-on-every-push.md` |

**Status:** ✅ ALL PASS

---

## Execution Selection

**Tasks:** 1
**Dependencies:** no
**User Preference:** none
**Decision:** Inline
**Reasoning:** 仅 1 个 Task、单文件 4 行 YAML 改动，subagent 调度开销大于任务本身；inline 执行最快

**Auto-invoking:** 直接 inline 执行（不调用 subagent-driven-development，因任务规模 < 阈值）
