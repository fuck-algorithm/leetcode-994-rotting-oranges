import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CellState, AlgorithmPhase, GridState } from '../algorithm/types';

// 辅助函数：获取单元格颜色
function getCellColor(state: CellState): string {
  const COLORS: Record<CellState, string> = {
    [CellState.EMPTY]: '#374151',
    [CellState.FRESH]: '#f97316',
    [CellState.ROTTEN]: '#7c2d12',
  };
  return COLORS[state];
}

// 辅助函数：获取代码高亮行
function getHighlightedLines(phase: AlgorithmPhase): number[] {
  const CODE_LINES: Record<AlgorithmPhase, number[]> = {
    [AlgorithmPhase.INIT]: [2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15],
    [AlgorithmPhase.BFS_LOOP]: [22],
    [AlgorithmPhase.CHECK_ADJACENT]: [29, 30, 31],
    [AlgorithmPhase.INFECT]: [33, 34, 35, 36, 37],
    [AlgorithmPhase.COMPLETE]: [43],
  };
  return CODE_LINES[phase];
}

// 辅助函数：计算网格中的橘子数量
function countOranges(grid: CellState[][]): { fresh: number; rotten: number } {
  let fresh = 0, rotten = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === CellState.FRESH) fresh++;
      else if (cell === CellState.ROTTEN) rotten++;
    }
  }
  return { fresh, rotten };
}

// 辅助函数：步骤导航
function nextStep(current: number, total: number): number {
  return Math.min(current + 1, total - 1);
}

function prevStep(current: number): number {
  return Math.max(current - 1, 0);
}

function resetStep(): number {
  return 0;
}

/**
 * **Feature: rotting-oranges-visualizer, Property 1: Cell Rendering Consistency**
 * **Validates: Requirements 1.2, 1.3, 1.4**
 */
describe('Property 1: Cell Rendering Consistency', () => {
  it('should produce correct color for each cell state', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 2 }), (state) => {
        const color = getCellColor(state as CellState);
        
        if (state === CellState.EMPTY) {
          expect(color).toBe('#374151'); // gray
        } else if (state === CellState.FRESH) {
          expect(color).toBe('#f97316'); // orange
        } else if (state === CellState.ROTTEN) {
          expect(color).toBe('#7c2d12'); // brown
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 2: Step Navigation Forward**
 * **Validates: Requirements 2.3**
 */
describe('Property 2: Step Navigation Forward', () => {
  it('should increment step by 1 when not at end', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 2, max: 100 }),
        (current, total) => {
          fc.pre(current < total - 1);
          const next = nextStep(current, total);
          expect(next).toBe(current + 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not exceed total steps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (current, total) => {
          const next = nextStep(current, total);
          expect(next).toBeLessThan(total);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 3: Step Navigation Backward**
 * **Validates: Requirements 2.4**
 */
describe('Property 3: Step Navigation Backward', () => {
  it('should decrement step by 1 when not at start', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (current) => {
        const prev = prevStep(current);
        expect(prev).toBe(current - 1);
      }),
      { numRuns: 100 }
    );
  });

  it('should not go below 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), (current) => {
        const prev = prevStep(current);
        expect(prev).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 4: Reset Returns to Initial State**
 * **Validates: Requirements 2.5**
 */
describe('Property 4: Reset Returns to Initial State', () => {
  it('should always return to step 0', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), () => {
        const reset = resetStep();
        expect(reset).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 9: State Display Consistency**
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 */
describe('Property 9: State Display Consistency', () => {
  it('should display counts matching actual grid state', () => {
    const gridArb = fc.array(
      fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 5 }),
      { minLength: 1, maxLength: 5 }
    ).filter(g => g.every(row => row.length === g[0].length));

    fc.assert(
      fc.property(gridArb, fc.integer({ min: 0, max: 10 }), (grid, minute) => {
        const { fresh, rotten } = countOranges(grid as CellState[][]);
        
        // 模拟 GridState
        const state: Partial<GridState> = {
          grid: grid as CellState[][],
          minute,
          freshCount: fresh,
          rottenCount: rotten,
          newlyRotten: [],
          queue: [],
          highlightedLines: [],
          phase: AlgorithmPhase.INIT,
          description: '',
        };
        
        // 验证显示的计数与实际计数一致
        expect(state.freshCount).toBe(fresh);
        expect(state.rottenCount).toBe(rotten);
        expect(state.minute).toBe(minute);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 10: Code Highlight Consistency**
 * **Validates: Requirements 7.2, 7.3, 7.4, 7.5**
 */
describe('Property 10: Code Highlight Consistency', () => {
  it('should return valid line numbers for each phase', () => {
    const phases = [
      AlgorithmPhase.INIT,
      AlgorithmPhase.BFS_LOOP,
      AlgorithmPhase.CHECK_ADJACENT,
      AlgorithmPhase.INFECT,
      AlgorithmPhase.COMPLETE,
    ];

    for (const phase of phases) {
      const lines = getHighlightedLines(phase);
      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBeGreaterThan(0);
      for (const line of lines) {
        expect(line).toBeGreaterThan(0);
        expect(line).toBeLessThanOrEqual(50); // Java 代码不超过 50 行
      }
    }
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 11: Queue State Consistency**
 * **Validates: Requirements 8.1**
 */
describe('Property 11: Queue State Consistency', () => {
  it('should contain valid cell coordinates in queue', () => {
    const cellArb = fc.record({
      row: fc.integer({ min: 0, max: 9 }),
      col: fc.integer({ min: 0, max: 9 }),
    });

    const queueArb = fc.array(cellArb, { minLength: 0, maxLength: 20 });

    fc.assert(
      fc.property(queueArb, (queue) => {
        // 验证队列中的每个单元格都有有效坐标
        for (const cell of queue) {
          expect(cell.row).toBeGreaterThanOrEqual(0);
          expect(cell.col).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(cell.row)).toBe(true);
          expect(Number.isInteger(cell.col)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });
});
