import { CellState } from '../algorithm/types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function parseGrid(input: string): CellState[][] | null {
  try {
    const trimmed = input.trim();
    if (!trimmed) return null;
    
    // 支持 [[2,1,1],[1,1,0],[0,1,1]] 格式
    const parsed = JSON.parse(trimmed);
    
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    
    const result: CellState[][] = [];
    const colCount = parsed[0].length;
    
    for (const row of parsed) {
      if (!Array.isArray(row) || row.length !== colCount) return null;
      const gridRow: CellState[] = [];
      for (const cell of row) {
        if (typeof cell !== 'number' || ![0, 1, 2].includes(cell)) return null;
        gridRow.push(cell as CellState);
      }
      result.push(gridRow);
    }
    
    return result;
  } catch {
    return null;
  }
}

export function serializeGrid(grid: CellState[][]): string {
  return JSON.stringify(grid);
}

export function validateGrid(grid: CellState[][]): ValidationResult {
  if (!grid || grid.length === 0) {
    return { valid: false, error: '网格不能为空' };
  }
  
  const colCount = grid[0].length;
  if (colCount === 0) {
    return { valid: false, error: '网格列数不能为 0' };
  }
  
  for (let i = 0; i < grid.length; i++) {
    if (grid[i].length !== colCount) {
      return { valid: false, error: `第 ${i + 1} 行长度不一致` };
    }
    for (let j = 0; j < grid[i].length; j++) {
      const val = grid[i][j];
      if (![0, 1, 2].includes(val)) {
        return { valid: false, error: `位置 [${i}][${j}] 的值 ${val} 无效，只能是 0、1 或 2` };
      }
    }
  }
  
  return { valid: true };
}
