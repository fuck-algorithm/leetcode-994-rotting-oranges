import { describe, it, expect } from 'vitest';
import { computeCellSize } from '../useAutoFitGrid';

describe('computeCellSize', () => {
  it('happy path: 3x3 网格在 300x300 容器中计算合理尺寸', () => {
    const result = computeCellSize(300, 300, 3, 3);
    expect(result.cellSize).toBe(80);
    expect(result.width).toBe(3 * 80 + 2 * 4);
    expect(result.height).toBe(3 * 80 + 2 * 4);
  });

  it('edge case: 30 列网格在 600px 宽容器中受 minCellSize 下限保护', () => {
    const result = computeCellSize(600, 400, 10, 30, { gap: 4 });
    // 容器宽不足以容纳 30 列，cellSize 不会低于 minCellSize(20)
    expect(result.cellSize).toBe(20);
    // width 公式：cols * cellSize + (cols - 1) * gap
    expect(result.width).toBe(30 * 20 + 29 * 4);
  });

  it('error path: 行列数为 0 时不崩溃，返回 maxCellSize', () => {
    const result = computeCellSize(300, 300, 0, 0);
    expect(result.cellSize).toBe(80);
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  it('正方形网格在窄高容器中按高度方向受限', () => {
    const result = computeCellSize(1000, 100, 10, 1, { gap: 4, minCellSize: 5 });
    expect(result.cellSize).toBe(6);
  });
});
