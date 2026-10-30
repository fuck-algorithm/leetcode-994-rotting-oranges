# LeetCode 994 — Rotting Oranges | Interactive BFS Visualization

An interactive, step-by-step visualization of multi-source breadth-first search (BFS), showing how rotten oranges spread infection minute by minute and how the queue drives the algorithm.

**Live demo:** [Open the visualization](https://fuck-algorithm.github.io/leetcode-994-rotting-oranges/)

## What you can explore

- Follow each BFS wave and inspect the grid, queue, infection times, variables, and highlighted Java code.
- Step forward/backward, play or pause, change playback speed, or jump to any step.
- Load built-in examples, enter a grid such as `[[2,1,1],[1,1,0],[0,1,1]]`, or generate a random grid.
- Read each step's explanation to understand what is being checked and why.

### Grid legend

`0` = empty cell · `1` / 🍊 = fresh orange · `2` / 🟤 = rotten orange. A highlighted source spreads to its adjacent cells; the queue stores oranges waiting to spread in a later BFS wave. The infection timestamp (`tN`) indicates the minute an orange became rotten.

## Run locally

```bash
npm ci
npm run dev
```

## 中文说明

这是一个 LeetCode 994「腐烂的橘子」交互式演示，通过逐步动画讲解多源广度优先搜索（BFS）：腐烂橘子如何按分钟向外扩散，以及队列如何驱动搜索。

### 可以探索什么

- 逐步查看每一轮 BFS 扩散，并观察网格、队列、感染时间、变量和 Java 代码高亮。
- 上一步/下一步、播放/暂停、调整速度，或拖动进度条跳转。
- 使用内置示例、自定义输入（如 `[[2,1,1],[1,1,0],[0,1,1]]`），或生成随机网格。
- 阅读每一步的说明，理解当前检查的内容及其原因。

### 网格图例

`0` = 空格 · `1` / 🍊 = 新鲜橘子 · `2` / 🟤 = 腐烂橘子。高亮的腐烂橘子会感染相邻格子；队列保存等待后续 BFS 波次扩散的橘子。感染时间标记（`tN`）表示橘子在哪一分钟变腐烂。

## 本地运行

```bash
npm ci
npm run dev
```
