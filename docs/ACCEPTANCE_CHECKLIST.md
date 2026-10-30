# 验收清单（AC-001 ~ AC-023）

状态定义：**PASS** = 有证据满足要求；**FAIL** = 不满足或缺少必要证据；**N/A** 仅在需求确实不适用且记录依据与审批人时使用。不能把未测试事项标为 PASS。

| AC | 验收项 | 当前状态 | 证据 / 缺口 |
| --- | --- | --- | --- |
| AC-001 | 单屏与 1366×768、1920×1080 空间预算 | FAIL | 当前布局不是 Skill 指定的画布优先工作区；缺双视口 E2E 尺寸断言。 |
| AC-002 | 标题链接指向题目且新标签打开 | FAIL | `Header.tsx` 有题目外链；现有 E2E 未验证链接与 target。 |
| AC-003 | Hot 100 返回链接正确 | FAIL | 当前 Header 指向 leetcode.cn study plan，而不是规定的 `https://fuck-algorithm.github.io/leetcode-hot-100/`。 |
| AC-004 | GitHub 徽标正确、新标签打开 | FAIL | 有 GitHub 链接，缺专门断言。 |
| AC-005 | GitHub Star API、IndexedDB 1 小时缓存及失败回退 | FAIL | 未实现 Star 数读取/缓存。 |
| AC-006 | 多解法具有独立步骤、代码与画布 | N/A（不计 PASS） | 本项目只演示一种 BFS 解法；无审批豁免记录，AC 整体判定仍为 FAIL。 |
| AC-007 | 输入校验、样例、随机合法数据 | FAIL | 具备解析/样例/随机输入，但随机生成范围可达 30 列，与题目约束每维 ≤10 不符；缺输入工作流 E2E。 |
| AC-008 | Java/Python/Go/JavaScript、默认 Java、持久化及行联动 | FAIL | 仅有 Java 代码面板，缺其余语言与持久化。 |
| AC-009 | 画布平移缩放、居中与信息密度 | FAIL | 有 D3 zoom 和网格展示；10 步 E2E 验证 SVG 尺寸/节点稳定，但缺交互与空间验收。 |
| AC-010 | 数据结构联动、状态转移及空格表达 | FAIL | 有网格、队列、感染时间；未提供完整人工验收证据。 |
| AC-011 | Left/Right/Space/R、进度条拖拽 | FAIL | 部分方向键与进度条实现；R 重置快捷键和拖拽完整断言缺失。 |
| AC-012 | 播放速度偏好持久化 | FAIL | 无持久化证据。 |
| AC-013 | 悬浮球、二维码比例及提示 | FAIL | 使用 `public/assets/wechat-qrcode.png`，而非要求的 `public/assets/qrcode-community.png`；缺构建资产和 hover E2E。 |
| AC-014 | 无紫色主题 | PASS | `qa:guard` 与 reduced-motion E2E 的禁用颜色扫描通过。 |
| AC-015 | Pages 工作流可用 | PASS | Actions run `41088884649` 成功完成 build 与 deploy；工作流位于 `.github/workflows/deploy.yml`。 |
| AC-016 | lint/type-check/build 通过 | PASS（本地） | 本轮文档修订后本地 lint、type-check、build 均通过；CI 通过 build 内部 `tsc -b` 做类型检查，但没有单独 `npm run type-check` 步骤。 |
| AC-017 | 15 条必过 Playwright 用例全部通过 | FAIL | 仓库只有 2 条 E2E，不满足 15 条矩阵。 |
| AC-018 | README 精简为题目、一句话、线上链接 | PASS | 根 README 仅包含三项信息。 |
| AC-019 | 覆盖率达标 | PASS | 本地最近一次实测 40 项测试通过；总覆盖率行 93.63%、函数 100%、分支 98.26%（Vitest 当前覆盖源算法与工具模块）。 |
| AC-020 | 单元测试目录/用例存在 | PASS | 多个 `src/**/*.test.ts(x)` 单元测试存在。 |
| AC-021 | Vitest 配置完整 | PASS | `vitest.config.ts` 配置 jsdom、coverage v8 与阈值。 |
| AC-022 | 输入校验正反向单测 | PASS | `gridParser.test.ts` 覆盖解析/校验行为。 |
| AC-023 | 动画语义步骤、稳定布局、教学层、reduced motion 与证据 | FAIL | 快照含操作/解说/锚点，D3 按稳定 cell ID join；Playwright 验证 3×3 样例十步尺寸稳定及 reduced motion。仍缺统一 MOTION token、完整 15 条 E2E、录屏/相邻帧/视口证据；故 AC-023 整体不通过。 |

## 总判定

**FAIL**。AC-003、005、008、012、013、017 等明确不符合阻断要求；AC-023 的证据不完整。具体缺陷、证据及评分见 `ACCEPTANCE_REPORT_TEMPLATE.md`。
