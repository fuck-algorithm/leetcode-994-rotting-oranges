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
