# 质量门禁

## 目标

所有提交至少通过静态检查、类型检查、单元覆盖率、Playwright 浏览器测试与生产构建。失败即阻止 GitHub Pages 部署。

## 本地命令

```bash
npm ci
npm run qa:guard
npm run type-check
npm run test:unit
npm run test:coverage
npm run test:e2e:install # 首次运行或 Playwright 浏览器更新时
npm run test:e2e
npm run lint
npm run build
```

| 门禁 | 通过条件 | 当前项目实现 |
| --- | --- | --- |
| 动画静态约束 | 稳定 ID keyed join、reduced motion、图例/解说、禁用紫色检查通过 | `npm run qa:guard` |
| 类型检查 | TypeScript 无错误 | `npm run type-check` |
| 单元测试 | 全部通过 | `npm run test:unit` |
| 覆盖率 | 行 ≥60%、函数 ≥60%、分支 ≥50% | `npm run test:coverage`；范围为 `src/algorithm/` 与 `src/utils/` |
| 浏览器测试 | 所有仓库内 E2E 用例通过 | `npm run test:e2e` |
| 代码规范 | ESLint 无错误 | `npm run lint` |
| 生产构建 | TypeScript 与 Vite 构建成功 | `npm run build` |
| 发布 | 上述步骤通过后上传 `dist/` 并部署 Pages | `.github/workflows/deploy.yml` |

CI 必须安装 Playwright Chromium 后再执行 E2E。不得把未执行的用例或人工检查报告为通过。当前测试总数及完整验收缺口见 `ACCEPTANCE_REPORT_TEMPLATE.md`。
