import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseGrid, serializeGrid, validateGrid } from './gridParser';
import { CellState } from '../algorithm/types';

/**
 * **Feature: rotting-oranges-visualizer, Property 7: Grid Parsing Round Trip**
 * **Validates: Requirements 4.1**
 */
describe('Property 7: Grid Parsing Round Trip', () => {
  it('should produce equivalent grid after serialize then parse', () => {
    const gridArb = fc.array(
      fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 10 }),
      { minLength: 1, maxLength: 10 }
    ).filter(g => g.every(row => row.length === g[0].length));

    fc.assert(
      fc.property(gridArb, (grid) => {
        const serialized = serializeGrid(grid as CellState[][]);
        const parsed = parseGrid(serialized);
        
        expect(parsed).not.toBeNull();
        expect(parsed).toEqual(grid);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: rotting-oranges-visualizer, Property 8: Invalid Input Rejection**
 * **Validates: Requirements 4.2**
 */
describe('Property 8: Invalid Input Rejection', () => {
  it('should reject strings with invalid characters', () => {
    const invalidStrings = [
      'abc',
      '[[a,b,c]]',
      '[[1,2,3]]', // 3 is invalid
      '[[1,2,-1]]',
      'null',
      'undefined',
      '{}',
      '[]',
      '',
      '   ',
    ];

    for (const str of invalidStrings) {
      const result = parseGrid(str);
      expect(result).toBeNull();
    }
  });

  it('should reject grids with inconsistent row lengths', () => {
    const result = parseGrid('[[1,2],[1]]');
    expect(result).toBeNull();
  });

  it('should reject random non-JSON strings', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => {
          try {
            const parsed = JSON.parse(s);
            // 排除有效的网格格式
            if (!Array.isArray(parsed)) return true;
            if (parsed.length === 0) return true;
            if (!parsed.every(Array.isArray)) return true;
            return false;
          } catch {
            return true;
          }
        }),
        (str) => {
          const result = parseGrid(str);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('validateGrid', () => {
  it('should validate correct grids', () => {
    const grid: CellState[][] = [[0, 1, 2], [1, 1, 0]];
    const result = validateGrid(grid);
    expect(result.valid).toBe(true);
  });

  it('should reject empty grids', () => {
    const result = validateGrid([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('空');
  });

  it('should reject grids with inconsistent row lengths', () => {
    const grid = [[1, 2], [1]] as CellState[][];
    const result = validateGrid(grid);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('长度');
  });
});
