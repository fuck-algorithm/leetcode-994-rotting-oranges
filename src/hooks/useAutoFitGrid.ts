import { useState, useEffect, RefObject } from 'react';

interface UseAutoFitGridProps {
  /** 容器 ref */
  containerRef: RefObject<HTMLElement | null>;
  /** 网格行数 */
  rows: number;
  /** 网格列数 */
  cols: number;
  /** 单元格间距 */
  gap?: number;
  /** 留白（容器内边距等） */
  padding?: number;
  /** 单元格最大尺寸上限 */
  maxCellSize?: number;
  /** 单元格最小尺寸下限 */
  minCellSize?: number;
}

export interface AutoFitResult {
  /** 计算出的单元格尺寸 */
  cellSize: number;
  /** svg 总宽度 */
  width: number;
  /** svg 总高度 */
  height: number;
  /** 容器实际宽高 */
  containerWidth: number;
  containerHeight: number;
}

/**
 * 根据容器可用空间和网格行列数，自动计算单元格尺寸。
 * 保证网格完整可见不溢出，同时尽量填满容器。
 */
export function useAutoFitGrid({
  containerRef,
  rows,
  cols,
  gap = 4,
  padding = 0,
  maxCellSize = 80,
  minCellSize = 20,
}: UseAutoFitGridProps): AutoFitResult {
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef]);

  const { width: cw, height: ch } = containerSize;

  const availW = Math.max(0, cw - padding * 2);
  const availH = Math.max(0, ch - padding * 2);

  const sizeByWidth = cols > 0 ? (availW - (cols - 1) * gap) / cols : maxCellSize;
  const sizeByHeight = rows > 0 ? (availH - (rows - 1) * gap) / rows : maxCellSize;

  const raw = Math.min(sizeByWidth, sizeByHeight);
  const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(raw)));

  const width = cols > 0 ? cols * cellSize + (cols - 1) * gap : 0;
  const height = rows > 0 ? rows * cellSize + (rows - 1) * gap : 0;

  return {
    cellSize,
    width,
    height,
    containerWidth: cw,
    containerHeight: ch,
  };
}

/**
 * 纯函数版本：给定容器尺寸与网格尺寸计算 cellSize。
 * 供测试使用，不依赖 DOM。
 */
export function computeCellSize(
  containerWidth: number,
  containerHeight: number,
  rows: number,
  cols: number,
  options: { gap?: number; padding?: number; maxCellSize?: number; minCellSize?: number } = {}
): AutoFitResult {
  const { gap = 4, padding = 0, maxCellSize = 80, minCellSize = 20 } = options;
  const availW = Math.max(0, containerWidth - padding * 2);
  const availH = Math.max(0, containerHeight - padding * 2);
  const sizeByWidth = cols > 0 ? (availW - (cols - 1) * gap) / cols : maxCellSize;
  const sizeByHeight = rows > 0 ? (availH - (rows - 1) * gap) / rows : maxCellSize;
  const raw = Math.min(sizeByWidth, sizeByHeight);
  const cellSize = Math.max(minCellSize, Math.min(maxCellSize, Math.floor(raw)));
  const width = cols > 0 ? cols * cellSize + (cols - 1) * gap : 0;
  const height = rows > 0 ? rows * cellSize + (rows - 1) * gap : 0;
  return {
    cellSize,
    width,
    height,
    containerWidth,
    containerHeight,
  };
}
