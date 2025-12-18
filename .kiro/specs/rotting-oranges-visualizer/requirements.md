# Requirements Document

## Introduction

本项目是一个基于 TypeScript + React + D3.js 的算法可视化演示应用，用于展示 LeetCode 994 题"腐烂的橘子"的 BFS 算法解题过程。应用将以分步骤、分镜头的动画形式，在单屏幕上展示橘子腐烂的传播过程，同时展示对应的 Java 代码并高亮当前执行的代码行，帮助用户直观理解 BFS 算法的执行流程。

## Glossary

- **Grid（网格）**: m x n 的二维数组，表示橘子的分布状态
- **Fresh Orange（新鲜橘子）**: 网格中值为 1 的单元格
- **Rotten Orange（腐烂橘子）**: 网格中值为 2 的单元格
- **Empty Cell（空单元格）**: 网格中值为 0 的单元格
- **BFS（广度优先搜索）**: 用于模拟腐烂传播的算法，每轮处理当前所有腐烂橘子的相邻新鲜橘子
- **Queue（队列）**: BFS 算法中用于存储待处理腐烂橘子坐标的数据结构
- **Minute（分钟）**: 算法中的一个时间单位，每分钟所有腐烂橘子同时感染相邻的新鲜橘子
- **Animation Step（动画步骤）**: 可视化中的一个离散状态，展示某一时刻的网格状态
- **Code Highlight（代码高亮）**: 在代码面板中高亮显示当前正在执行的代码行
- **Visualizer（可视化器）**: 负责渲染网格和动画的 D3.js 组件
- **Debug Mode（调试模式）**: 代码面板中模拟 IDE 调试器的效果，高亮当前执行行并在变量所在行后展示变量的内存值
- **Variable Inline Display（变量内联展示）**: 在代码行末尾展示该行相关变量的当前值
- **Keyboard Shortcut（键盘快捷键）**: 绑定到控制按钮的键盘按键，用于快速操作
- **GitHub Pages**: GitHub 提供的静态网站托管服务
- **GitHub Actions**: GitHub 提供的 CI/CD 自动化工作流服务

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a grid visualization of the rotting oranges problem, so that I can understand the initial state of the problem.

#### Acceptance Criteria

1. WHEN the application loads THEN the Visualizer SHALL display a m x n grid with cells colored according to their state (empty, fresh, rotten)
2. WHEN a cell contains a fresh orange THEN the Visualizer SHALL render the cell with an orange color and fresh indicator
3. WHEN a cell contains a rotten orange THEN the Visualizer SHALL render the cell with a brown/dark color and rotten indicator
4. WHEN a cell is empty THEN the Visualizer SHALL render the cell with a neutral/gray color

### Requirement 2

**User Story:** As a user, I want to control the animation playback, so that I can study the algorithm at my own pace.

#### Acceptance Criteria

1. WHEN the user clicks the play button THEN the Visualizer SHALL start the step-by-step animation automatically
2. WHEN the user clicks the pause button THEN the Visualizer SHALL pause the animation at the current step
3. WHEN the user clicks the next step button THEN the Visualizer SHALL advance to the next animation step
4. WHEN the user clicks the previous step button THEN the Visualizer SHALL return to the previous animation step
5. WHEN the user clicks the reset button THEN the Visualizer SHALL return to the initial state

### Requirement 3

**User Story:** As a user, I want to see the BFS algorithm execute step by step, so that I can understand how the rotting spreads minute by minute.

#### Acceptance Criteria

1. WHEN the animation advances one minute THEN the Visualizer SHALL highlight all fresh oranges adjacent to rotten oranges
2. WHEN a fresh orange becomes rotten THEN the Visualizer SHALL animate the color transition from fresh to rotten
3. WHEN all oranges in a minute have been processed THEN the Visualizer SHALL display the current minute count
4. WHEN no more fresh oranges can be infected THEN the Visualizer SHALL display the final result (total minutes or -1 if impossible)

### Requirement 4

**User Story:** As a user, I want to input custom grid configurations, so that I can test different scenarios.

#### Acceptance Criteria

1. WHEN the user enters a valid grid configuration THEN the Visualizer SHALL parse the input and display the new grid
2. WHEN the user enters an invalid grid configuration THEN the Visualizer SHALL display an error message and maintain the current state
3. WHEN the user selects a preset example THEN the Visualizer SHALL load and display that example grid

### Requirement 5

**User Story:** As a user, I want to see algorithm state information, so that I can track the progress of the BFS execution.

#### Acceptance Criteria

1. WHILE the animation is running THEN the Visualizer SHALL display the current minute/step number
2. WHILE the animation is running THEN the Visualizer SHALL display the count of remaining fresh oranges
3. WHILE the animation is running THEN the Visualizer SHALL display the count of rotten oranges
4. WHEN the algorithm completes THEN the Visualizer SHALL display whether all oranges were rotted and the total time taken

### Requirement 6

**User Story:** As a user, I want the application to run on a single screen with port 40889, so that I can access it easily.

#### Acceptance Criteria

1. WHEN the application starts THEN the Server SHALL listen on port 40889
2. WHEN the application renders THEN the Visualizer SHALL fit all content within a single viewport without scrolling
3. WHEN the viewport size changes THEN the Visualizer SHALL responsively adjust the grid size to fit the screen

### Requirement 7

**User Story:** As a user, I want to see the Java code alongside the visualization, so that I can understand how the algorithm is implemented.

#### Acceptance Criteria

1. WHEN the application loads THEN the Code Panel SHALL display the complete BFS Java solution code with syntax highlighting
2. WHEN the animation advances to a new step THEN the Code Panel SHALL highlight the corresponding code lines being executed
3. WHEN the algorithm initializes the queue with rotten oranges THEN the Code Panel SHALL highlight the initialization loop
4. WHEN the algorithm processes the queue THEN the Code Panel SHALL highlight the BFS main loop
5. WHEN the algorithm checks adjacent cells THEN the Code Panel SHALL highlight the direction traversal code

### Requirement 8

**User Story:** As a user, I want to see the BFS queue state, so that I can understand how the algorithm processes oranges.

#### Acceptance Criteria

1. WHILE the animation is running THEN the Queue Panel SHALL display the current contents of the BFS queue
2. WHEN an orange is added to the queue THEN the Queue Panel SHALL animate the addition with visual feedback
3. WHEN an orange is removed from the queue THEN the Queue Panel SHALL animate the removal with visual feedback
4. WHEN the queue becomes empty THEN the Queue Panel SHALL display an empty state indicator

### Requirement 9

**User Story:** As a user, I want the page title to match LeetCode's format with a clickable link, so that I can easily navigate to the original problem.

#### Acceptance Criteria

1. WHEN the application loads THEN the Header SHALL display the title "994. 腐烂的橘子" matching LeetCode's format
2. WHEN the user clicks the title THEN the Browser SHALL navigate to the LeetCode problem page (https://leetcode.cn/problems/rotting-oranges/)
3. WHEN the user hovers over the title THEN the Header SHALL display visual feedback indicating the title is clickable

### Requirement 10

**User Story:** As a user, I want to see a GitHub icon in the header, so that I can easily access the project repository.

#### Acceptance Criteria

1. WHEN the application loads THEN the Header SHALL display a GitHub icon in the top-right corner
2. WHEN the user clicks the GitHub icon THEN the Browser SHALL navigate to the project repository page in a new tab
3. WHEN the user hovers over the GitHub icon THEN the Header SHALL display visual feedback indicating the icon is clickable

### Requirement 11

**User Story:** As a user, I want the code panel to display debug-like effects with variable values, so that I can understand the algorithm state at each step.

#### Acceptance Criteria

1. WHEN the animation advances to a step THEN the Code Panel SHALL highlight the currently executing code line with a distinct background color
2. WHEN a variable value changes at the current step THEN the Code Panel SHALL display the variable's current value inline after the corresponding code line
3. WHEN displaying variable values THEN the Code Panel SHALL show key variables including: fresh (remaining fresh oranges count), queue size, current cell coordinates (r, c), and minutes
4. WHEN the variable value display updates THEN the Code Panel SHALL animate the value change with visual feedback
5. WHEN the algorithm phase changes THEN the Code Panel SHALL update the highlighted line and variable displays to reflect the new state

### Requirement 12

**User Story:** As a user, I want to use keyboard shortcuts to control the animation, so that I can navigate the visualization more efficiently.

#### Acceptance Criteria

1. WHEN the user presses the Left Arrow key THEN the Controls SHALL trigger the previous step action
2. WHEN the user presses the Right Arrow key THEN the Controls SHALL trigger the next step action
3. WHEN the user presses the Space key THEN the Controls SHALL toggle between play and pause states
4. WHEN the application loads THEN the Control buttons SHALL display the corresponding keyboard shortcut hints (←, →, Space)
5. WHEN a keyboard shortcut is pressed THEN the corresponding button SHALL display visual feedback indicating activation

### Requirement 13

**User Story:** As a developer, I want the project to automatically deploy to GitHub Pages when code is pushed, so that the latest version is always available online.

#### Acceptance Criteria

1. WHEN code is pushed to the main branch THEN the GitHub Actions workflow SHALL trigger automatically
2. WHEN the workflow runs THEN the GitHub Actions SHALL build the project using the production configuration
3. WHEN the build succeeds THEN the GitHub Actions SHALL deploy the built files to GitHub Pages
4. WHEN the deployment completes THEN the GitHub Pages site SHALL serve the updated application
5. WHEN the build fails THEN the GitHub Actions SHALL report the error and prevent deployment

### Requirement 14

**User Story:** As a user, I want to see detailed cell information on the grid, so that I can better understand the algorithm's execution at each position.

#### Acceptance Criteria

1. WHEN a cell is rendered THEN the Grid Visualizer SHALL display the cell's coordinate (row, col) within the cell
2. WHEN a fresh orange becomes rotten THEN the Grid Visualizer SHALL display the infection time (minute number) on that cell
3. WHEN the algorithm is processing a cell THEN the Grid Visualizer SHALL highlight that cell with a distinct border or glow effect
4. WHEN checking adjacent cells THEN the Grid Visualizer SHALL show directional indicators pointing to the cells being checked

### Requirement 15

**User Story:** As a user, I want to see enhanced statistics and progress information, so that I can track the algorithm's overall progress.

#### Acceptance Criteria

1. WHILE the animation is running THEN the State Panel SHALL display the total cell count and breakdown (empty, fresh, rotten)
2. WHILE the animation is running THEN the State Panel SHALL display the infection progress as a percentage
3. WHEN a minute completes THEN the State Panel SHALL display how many oranges were infected in that minute
4. WHILE the animation is running THEN the State Panel SHALL display the current BFS wave/level number

### Requirement 16

**User Story:** As a user, I want to see enhanced queue visualization with detailed information, so that I can understand the BFS processing order.

#### Acceptance Criteria

1. WHEN displaying queue contents THEN the Queue Panel SHALL show each cell's coordinates (row, col) clearly
2. WHEN a cell is being processed THEN the Queue Panel SHALL highlight the front element being dequeued
3. WHEN new cells are added to the queue THEN the Queue Panel SHALL visually distinguish newly added elements
4. WHILE the animation is running THEN the Queue Panel SHALL display the queue size and capacity information
