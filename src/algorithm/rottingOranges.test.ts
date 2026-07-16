import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSteps, getAdjacentFresh } from './rottingOranges';
import { CellState, AlgorithmPhase } from './types';

/**
 * **Feature: rotting-oranges-visualizer, Property 5: BFS Adjacent Cell Identification**
 * **Validates: Requirements 3.1**
 */
describe('Property 5: BFS Adjacent Cell Identification', () => {
  it('should correctly identify all adjacent fresh oranges for any rotten cell', () => {
    const gridArb = fc.array(
      fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 5 }),
      { minLength: 1, maxLength: 5 }
    ).filter(g => g.every(row => row.length === g[0].length));

    fc.assert(
      fc.property(gridArb, (grid) => {
        const M = grid.length, N = grid[0].length;
        
        for (let r = 0; r < M; r++) {
          for (let c = 0; c < N; c++) {
            if (grid[r][c] === CellState.ROTTEN) {
              const adjacent = getAdjacentFresh(grid as CellState[][], r, c);
              
              // 验证所有返回的单元格都是新鲜橘子且相邻
              for (const cell of adjacent) {
                expect(grid[cell.row][cell.col]).toBe(CellState.FRESH);
                const dist = Math.abs(cell.row - r) + Math.abs(cell.col - c);
                expect(dist).toBe(1);
              }
              
              // 验证没有遗漏任何相邻的新鲜橘子
              const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
              for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < M && nc >= 0 && nc < N && grid[nr][nc] === CellState.FRESH) {
                  expect(adjacent.some(a => a.row === nr && a.col === nc)).toBe(true);
                }
              }
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 6: Algorithm Result Correctness**
 * **Validates: Requirements 3.4**
 */
describe('Property 6: Algorithm Result Correctness', () => {
  // 简单的暴力解法作为参考
  function bruteForce(grid: number[][]): number {
    const M = grid.length, N = grid[0].length;
    const g = grid.map(r => [...r]);
    let fresh = 0;
    
    for (const row of g) {
      for (const cell of row) {
        if (cell === 1) fresh++;
      }
    }
    
    if (fresh === 0) return 0;
    
    let minutes = 0;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    while (fresh > 0 && minutes < 100) {
      const toRot: [number, number][] = [];
      
      for (let r = 0; r < M; r++) {
        for (let c = 0; c < N; c++) {
          if (g[r][c] === 2) {
            for (const [dr, dc] of dirs) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < M && nc >= 0 && nc < N && g[nr][nc] === 1) {
                toRot.push([nr, nc]);
              }
            }
          }
        }
      }
      
      if (toRot.length === 0) break;
      
      for (const [r, c] of toRot) {
        if (g[r][c] === 1) {
          g[r][c] = 2;
          fresh--;
        }
      }
      minutes++;
    }
    
    return fresh === 0 ? minutes : -1;
  }

  it('should produce correct final result for any valid grid', () => {
    const gridArb = fc.array(
      fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 5 }),
      { minLength: 1, maxLength: 5 }
    ).filter(g => g.every(row => row.length === g[0].length));

    fc.assert(
      fc.property(gridArb, (grid) => {
        const result = generateSteps(grid as CellState[][]);
        const expected = bruteForce(grid);
        expect(result.finalMinutes).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });
});

// 单元测试：已知示例
describe('Known Examples', () => {
  it('Example 1: [[2,1,1],[1,1,0],[0,1,1]] should return 4', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    expect(result.finalMinutes).toBe(4);
    expect(result.success).toBe(true);
  });

  it('Example 2: [[2,1,1],[0,1,1],[1,0,1]] should return -1', () => {
    const grid: CellState[][] = [[2, 1, 1], [0, 1, 1], [1, 0, 1]];
    const result = generateSteps(grid);
    expect(result.finalMinutes).toBe(-1);
    expect(result.success).toBe(false);
  });

  it('Example 3: [[0,2]] should return 0', () => {
    const grid: CellState[][] = [[0, 2]];
    const result = generateSteps(grid);
    expect(result.finalMinutes).toBe(0);
    expect(result.success).toBe(true);
  });

  it('should have COMPLETE phase in final step', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.phase).toBe(AlgorithmPhase.COMPLETE);
  });
});

describe('Call Stack & Scope Data', () => {
  it('每个步骤都包含非空 callStack 与 scope', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    expect(result.steps.length).toBeGreaterThan(0);
    for (const step of result.steps) {
      expect(step.callStack).toBeDefined();
      expect(step.callStack!.length).toBeGreaterThan(0);
      expect(step.scope).toBeDefined();
      expect(step.callStack![0].id).toBe('method');
      expect(step.callStack![0].label).toContain('orangesRotting');
      step.callStack!.forEach((frame, i) => {
        expect(frame.depth).toBe(i);
      });
    }
  });

  it('BFS 阶段步骤的栈深度 >= 2（method + bfs-loop）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const bfsSteps = result.steps.filter(s => s.phase === AlgorithmPhase.BFS_LOOP);
    expect(bfsSteps.length).toBeGreaterThan(0);
    for (const step of bfsSteps) {
      expect(step.callStack!.length).toBeGreaterThanOrEqual(2);
      expect(step.callStack!.some(f => f.id === 'bfs-loop')).toBe(true);
    }
  });

  it('COMPLETE 阶段栈包含 return 帧', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const lastStep = result.steps[result.steps.length - 1];
    expect(lastStep.phase).toBe(AlgorithmPhase.COMPLETE);
    expect(lastStep.callStack!.some(f => f.id === 'return')).toBe(true);
  });
});

describe('演示可读性：step 粒度合理性', () => {
  it('示例1：初始化阶段 step 不超过 5 个（原 17+）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    const initSteps = result.steps.filter(s => s.phase === AlgorithmPhase.INIT);
    expect(initSteps.length).toBeLessThanOrEqual(5);
  });

  it('示例1：总 step 数显著减少（原 172 → 应 < 50）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    expect(result.steps.length).toBeLessThan(50);
  });

  it('示例2：check_adjacent 阶段 step 大幅减少（原 102 → 应 < 30）', () => {
    const grid: CellState[][] = [[2, 1, 1], [0, 1, 1], [1, 0, 1]];
    const result = generateSteps(grid);
    const checkSteps = result.steps.filter(s => s.phase === AlgorithmPhase.CHECK_ADJACENT);
    expect(checkSteps.length).toBeLessThan(30);
  });

  it('每个单格感染 step 都带 waveColor 和 targetCell（视觉强相关）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    // 单格感染 step：description 以"源"开头（"源 [r,c] 检查方向 → 感染"），区别于"分钟结束"整波总结
    const infectSteps = result.steps.filter(
      s => s.phase === AlgorithmPhase.INFECT && s.description.startsWith('源')
    );
    expect(infectSteps.length).toBeGreaterThan(0);
    for (const s of infectSteps) {
      expect(s.waveColor).toBeDefined();
      expect(s.targetCell).toBeDefined();
    }
  });

  it('description 是叙事句（含中文标点或箭头，非纯代码行）', () => {
    const grid: CellState[][] = [[2, 1, 1], [1, 1, 0], [0, 1, 1]];
    const result = generateSteps(grid);
    expect(result.steps.length).toBeGreaterThan(0);
    for (const s of result.steps) {
      // 叙事句应含中文逗号、句号、箭头 → 等可读符号
      const isNarrative = /[，。→！]/.test(s.description);
      expect(isNarrative).toBe(true);
    }
  });
});
