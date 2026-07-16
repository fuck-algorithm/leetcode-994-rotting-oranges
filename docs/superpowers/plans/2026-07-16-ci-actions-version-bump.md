# CI Actions 版本加固 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`
> Steps use checkbox (`- [ ]`) syntax.

**Goal:** 升级 `.github/workflows/deploy.yml` 中所有 GitHub Actions 到最新主版本（Node 24 运行时），并把 `setup-node` 的 Node 锁定到 24 LTS，消除 runner 上 Node 20 弃用 warning，避免未来 cutoff 导致部署失败。

**Architecture:** 开发者 push → 触发 deploy.yml → build job 用 `checkout@v7` 取代码 + `setup-node@v7`（Node 24）装 Node + `npm ci` 装依赖 + lint + test + `vite build` 出 dist → `configure-pages@v6` + `upload-pages-artifact@v5` 打包 artifact → deploy job 用 `deploy-pages@v5` 部署到 Pages。改动点：5 个 action 主版本号升级 + `node-version: '20'` → `'24'`。流水线结构与触发条件（`branches-ignore: [gh-pages]`）不变，因此"任意 push 自动部署"的核心期望不受影响。

**Tech Stack:** GitHub Actions, actions/checkout@v7, actions/setup-node@v7, actions/configure-pages@v6, actions/upload-pages-artifact@v5, actions/deploy-pages@v5, Node.js 24 LTS

**Risks:**
- 主版本升级（v4→v7/v5/v6）可能含破坏性输入参数变更 → 缓解：本项目对这些 action 仅用最基础参数（`cache: 'npm'`、`path: ./dist`、`node-version`），未触碰高级 API；升级后用 YAML 校验 + 推送后观察实际 run
- Node 20→24 升级可能暴露项目里 Node 20 的 deprecated API → 缓解：项目是纯前端 Vite/React，构建不依赖 Node 运行时 API；提交前本地在 Node 24 下跑 `npm ci && npm test && npm run build` 全绿才提交
- `setup-node@v7` 的 ESM 迁移可能影响 `cache: 'npm'` 行为 → 缓解：v7 release notes 未把 cache 列为破坏性变更；即使 cache 失败也只影响速度不影响构建正确性，且后续 push 的 run 日志会显示 cache 命中情况可观测
- 升级后首次 run 可能因新版本 action 的行为差异失败 → 缓解：Task 1 Step 6 用 `gh run watch` 实时观察首次 run，失败则读日志定位具体 step，回退该 action 版本

---

### Task 1: 升级 deploy.yml 全部 actions 版本到最新主版本

**Depends on:** None
**Files:**
- Modify: `.github/workflows/deploy.yml`（整体替换 jobs.steps 区块 + setup-node node-version）

- [ ] **Step 1: 替换 build job 全部 steps — 升级 checkout/setup-node 并锁 Node 24**
文件: `.github/workflows/deploy.yml:20-50`（替换整个 `build:` job 的 `steps:` 列表）

```yaml
# 替换 .github/workflows/deploy.yml 中 build job 的 steps 整块（原 :20-50）
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: '24'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm test -- --run

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v6

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v5
        with:
          path: ./dist
```

说明：
- `checkout@v4 → v7`、`setup-node@v4 → v7`、`configure-pages@v4 → v6`、`upload-pages-artifact@v3 → v5`：全部升到最新主版本（通过 `gh api repos/<action>/releases/latest` 实测确认）
- `node-version: '20' → '24'`：Node 24 为当前活跃 LTS，且 actions 生态已统一 Node 24 运行时，从源头消除 Node 20 弃用 warning
- `deploy` job 在下一步单独升级，保持 build/deploy 两个 step 块各自独立便于回退

- [ ] **Step 2: 替换 deploy job step — 升级 deploy-pages 到 v5 消除 warning 根因**
文件: `.github/workflows/deploy.yml:52-62`（替换 `deploy:` job 的 `steps:` 区块）

```yaml
# 替换 .github/workflows/deploy.yml 中 deploy job 的 steps 区块（原 :52-62）
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

说明：
- `deploy-pages@v4 → v5`：v5 的 release notes 明确 "Update Node.js version to 24.x"，这正是当前 warning 指名的 action，升级后该 deprecation warning 消失
- 其余字段（environment/url/needs/id）全部保持不变，仅升 action 版本号

- [ ] **Step 3: 校验 YAML 语法合法 — 确保升级后文件可解析**
Run: `python3 -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/deploy.yml')); assert 'build' in d['jobs'] and 'deploy' in d['jobs']; print('YAML valid, jobs:', list(d['jobs']))"`
Expected:
  - Exit code: 0
  - Output contains: "YAML valid, jobs: ['build', 'deploy']"

- [ ] **Step 4: 校验版本号已全部升级 — 确认无残留旧主版本**
Run: `grep -nE 'uses: actions/(checkout|setup-node|configure-pages|upload-pages-artifact|deploy-pages)@' .github/workflows/deploy.yml`
Expected:
  - Exit code: 0
  - Output contains: "checkout@v7" and "setup-node@v7" and "configure-pages@v6" and "upload-pages-artifact@v5" and "deploy-pages@v5"
  - Output does NOT contain: "@v3" or "@v4"

- [ ] **Step 5: 本地在 Node 24 下跑完整构建链 — 确认 Node 升级不破坏构建**
Run: `npm ci && npm run lint && npm test -- --run && npm run build`
Expected:
  - Exit code: 0
  - Output contains: "vite v" and "built in"
  - Output does NOT contain: "ERR!" or "FAIL" or "error TS"

- [ ] **Step 6: 提交并推送 — 触发升级后的首次部署 run**
Run: `git add .github/workflows/deploy.yml && git commit -m "ci: bump github actions to node24 runtimes (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5) and pin node to 24 lts" && git push`
Expected:
  - Exit code: 0
  - Output contains: "To github.com"

- [ ] **Step 7: 观察首次 run 结果 — 确认升级后部署仍成功且 warning 消失**
Run: `sleep 15 && gh run list --workflow=deploy.yml --limit 1 --json status,conclusion,headBranch,event`
Expected:
  - Exit code: 0
  - Output contains: `"event":"push"`
  - Output contains: `"headBranch":"feat/adaptive-canvas-debug-mode"` 或当前分支名
  - conclusion 字段为 `"success"` 或 `"in_progress"`（若仍在跑则用 `gh run watch` 等待）

补充验证（确认 Node 20 warning 消失）：
Run: `LATEST=$(gh run list --workflow=deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId') && gh run view "$LATEST" --log 2>&1 | grep -i "deprecated" || echo "NO DEPRECATION WARNING"`
Expected:
  - Exit code: 0
  - Output contains: "NO DEPRECATION WARNING"

---

## Self-Review Results

| # | Check | Result | Action Taken |
|---|-------|--------|-------------|
| 1 | Header 包含 Goal + Architecture + Tech Stack + Risks？ | PASS | — |
| 2 | 每个 Task 标注了 Depends on？ | PASS | Task 1 = None（单任务） |
| 3 | 每个 Task 列出精确文件路径？ | PASS | `.github/workflows/deploy.yml` build (:20-50) + deploy (:52-62) |
| 4 | 每个 Task 有 3-8 个 Step？ | PASS | Task 1 = 7 Step |
| 5 | 新文件步骤包含完整代码？ | N/A | 无新文件，仅修改 |
| 6 | 修改步骤包含替换后完整区块？ | PASS | build steps 与 deploy steps 各给出完整 YAML 块 |
| 7 | 代码块大小 5-80 行？ | PASS | build 块 31 行，deploy 块 11 行 |
| 8 | 所有引用已定义？ | PASS | 无悬空引用 |
| 9 | 每个 Task 有验证命令（命令+exit code+output）？ | PASS | Step 3/4/5/7 均含三要素 |
| 10 | Spec 每个需求有对应 Task？ | PASS | "修复发现的 Node 20 弃用问题" → Task 1 |
| 11 | 每个 Task 完成后可独立验证？ | PASS | Step 7 用 gh run list + 日志 grep 验证实际部署与 warning 消失 |
| 12 | 无 TBD/TODO/模糊描述？ | PASS | — |
| 13 | 无抽象指令？ | PASS | — |
| 14 | 跨 Task 一致性？ | N/A | 单 Task |
| 15 | 文件保存位置正确？ | PASS | `docs/superpowers/plans/2026-07-16-ci-actions-version-bump.md` |

**Status:** ✅ ALL PASS

---

## Execution Selection

**Tasks:** 1
**Dependencies:** no
**User Preference:** none
**Decision:** Inline
**Reasoning:** 仅 1 个 Task、单文件 YAML 版本号升级，subagent 调度开销大于任务本身；inline 执行最快；且 Step 5/7 需要本地构建与 gh run 观察的紧密交互，inline 更顺

**Auto-invoking:** 直接 inline 执行（不调用 subagent-driven-development，因任务规模 < 阈值）
