# 测试计划

## 范围

LeetCode 994「腐烂的橘子」单屏演示，覆盖网格输入校验、BFS 快照生成、网格可视化、播放控制、代码/变量联动、reduced motion 与 GitHub Pages 构建。

## 分层与用例

### 单元测试（Vitest）

位置：`src/**/*.test.ts(x)`。

- `src/algorithm/rottingOranges.test.ts`：三道官方样例、随机合法网格对拍 BFS 结果、邻接新鲜橘子识别、逐分钟步骤数、每个快照的 operation/narration/anchorIds、调用栈与作用域。
- `src/utils/gridParser.test.ts`：有效/无效网格解析与校验。
- `src/hooks/__tests__/useAutoFitGrid.test.ts`：网格尺寸计算边界。
- `src/components/components.test.ts`、`CallStackPanel.test.ts`：组件行为与展示。

命令：`npm run test:unit`；覆盖率：`npm run test:coverage`。当前配置覆盖 `src/algorithm/**/*.ts` 和 `src/utils/**/*.ts`，门槛为行 60%、函数 60%、分支 50%。

### 浏览器 E2E（Playwright）

位置：`tests/e2e/`。当前只有 `visualization.spec.ts` 中的 2 条用例：

1. 网格 keyed 节点在步进中复用；示例网格固定为 3×3；10 次步进的 SVG viewBox、SVG 边界与网格单元数保持不变；解说与图例可见。
2. `prefers-reduced-motion` 下 CSS 动画降级，页面不含禁用紫色 token。

首次执行安装 Chromium：`npm run test:e2e:install`，然后 `npm run test:e2e`。CI 已配置先安装浏览器再运行测试。

## 本地全量验证顺序

```bash
npm ci
npm run qa:guard
npm run type-check
npm run test:unit
npm run test:coverage
npm run test:e2e:install # 仅首次/浏览器版本更新
npm run test:e2e
npm run lint
npm run build
```

## 尚未覆盖的测试需求

与 Skill 的 15 条 E2E 矩阵相比，当前缺少 13 条完整验收用例（本项目两条可对应部分画布稳定/无障碍动效检查）。输入非法后不更新、随机生成边界、语言与速度持久化、所有键盘快捷键、进度条拖拽、平移缩放、弹窗、多解法、二维码资产完整性、Star 缓存、视口空间预算等尚未形成矩阵覆盖。不得将未实施用例描述为 PASS。
