# LeetCode 994「腐烂的橘子」动画规格

## 算法与可观察状态

- **算法：** 多源 BFS。网格中所有初始腐烂橘子先同时进入 FIFO 队列；每轮只扩散本轮开始时队列长度所对应的橘子。新感染橘子在下一分钟扩散。
- **主结构：** `m × n` 固定行列网格，题目约束 `1 ≤ m,n ≤ 10`。单元格稳定 ID 为 `${row}-${col}`；坐标由行列索引和 cellSize 计算，不受步骤数据影响。
- **单元格信息：** EMPTY/FRESH/ROTTEN、感染分钟 `infectionTime`、坐标标签、当前传播源、本轮新感染集合。
- **辅助结构：** FIFO 队列快照、minute、fresh/rotten/empty 计数、当前源/目标、传播方向。
- **代码状态：** `highlightedLines`、变量列表、调用栈与作用域快照；`operation`、`narration`、`anchorIds` 随每个 `GridState` 快照生成。

## 语义步骤与焦点

| 阶段 | operation | 焦点 | 教学目的 |
| --- | --- | --- | --- |
| INIT | `init` | 网格和初始腐烂源 | 识别网格规模，统计新鲜橘子并将腐烂源入队。 |
| BFS_LOOP | `read` | 本轮队列/当前源 | 说明 FIFO 顺序与本轮同步扩散边界。 |
| INFECT | `visit` | 一组本轮新感染格；最后一对源/目标由方向箭头标记 | 展示从已腐烂源向四邻传播，整波结果在同一快照出现。 |
| COMPLETE | `done` | 最终网格和返回值 | fresh 为 0 返回分钟数，否则仍有不可达橘子返回 -1。 |

算法快照在 `generateSteps` 中生成；画布只消费快照，不在渲染时重新计算 BFS。当前动画粒度聚合整波感染，避免逐个邻居产生过多重复步骤。每步描述用于解说；步骤元数据的锚点由高亮代码行映射成 `line-N`。

## 稳定布局与尺寸预算

- 每个网格格子对应稳定 ID `${r}-${c}`，D3 用 keyed join 更新；网格行列仅在用户加载另一个输入网格时改变，不随算法 step 改变。
- SVG viewBox 根据固定 rows/cols/cellSize 生成；同一输入过程中的 rows/cols 与 cellSize 固定。
- 画布布局：网格 SVG 独占画布卡片，步骤说明与固定图例放在右侧信息栏，不占用棋盘高度；右栏可独立滚动。修复前底部教学文字换行会改变 SVG 实际高度；当前 Playwright 与浏览器检查覆盖同一示例连续 10 步。
- 网格节点间距 4px；位置按 `x = col * (cellSize + 4)`、`y = row * (cellSize + 4)` 计算。
- 切换样例或自定义输入时允许矩阵大小改变，这是数据输入行为；单纯切步/播放不允许改变矩阵大小。

## 运动与状态表达

- 网格节点以 `.data(cellData, d => d.id)` keyed join 复用；D3 入场/退场时长在 `GridVisualizer.tsx` 为 160ms/120ms，`prefers-reduced-motion` 下归零；下一次渲染会中断入退场过渡。
- INFECT 阶段 pending cell 的背景与橘子图标通过 CSS `infectionFlash` / `infectionPulse` 呼吸；reduced motion CSS 关闭动画/过渡。
- 空格为深灰，新鲜为橙色，腐烂为深棕；当前源/新感染另以描边、发光、坐标和 `tN` 文本区分。波次色不是唯一状态信号，配色不含紫色。
- 当前实现的动画时长尚未统一抽取为 Skill 模板要求的 `MOTION` token；该差距未豁免，AC-023 保持 FAIL。

## 教学层

- 永久显示操作徽标 `operation-badge`、步骤解说 `step-narration` 和 `aria-live="polite"`。
- 永久显示固定图例：空格、新鲜、腐烂、发光边框语义及 `tN` 感染分钟。
- BFS 扩散时方向箭头文字指示传播方向与目标坐标；信息面板展示队列、剩余新鲜数和 BFS 状态。
- 指标目前由状态/队列面板展示；尚未补齐模板标准 `canvas-metrics` 2–3 项命名及其专项断言。

## Evidence and limits

## 验证证据与限制

- `npm run qa:guard`：稳定 keyed join、稳定 cell ID、过渡中断、reduced motion、教学层、动画规格文档、禁用紫色均 PASS。
- `npm run test:e2e`：现有 2 条通过。用示例 1 检查 10 步中 3×3 网格共 9 格、viewBox `0 0 203 203`、SVG 边界不变；另测 reduced motion 与紫色扫描。
- 完整视口空间预算 E2E、1x 播放录屏、相邻步骤截图归档、3x 播放/随机跳步/快速切解法的人工证据未完成；项目当前单解法。不能将 AC-023 或整体验收标为 PASS。
