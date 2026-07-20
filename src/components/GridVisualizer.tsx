import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GridState, CellState, Cell } from '../algorithm/types';

interface GridVisualizerProps {
  gridState: GridState;
  cellSize?: number;
  showCoordinates?: boolean;
  showInfectionTime?: boolean;
}

const COLORS = {
  [CellState.EMPTY]: '#374151',
  [CellState.FRESH]: '#f97316',
  [CellState.ROTTEN]: '#7c2d12',
};

function isNewlyRotten(row: number, col: number, newlyRotten: Cell[]): boolean {
  return newlyRotten.some(c => c.row === row && c.col === col);
}

export function GridVisualizer({
  gridState,
  cellSize = 60,
  showCoordinates = true,
  showInfectionTime = true,
}: GridVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const { grid, cellInfoGrid, newlyRotten, currentCell, waveColor, targetCell, pendingInfect } = gridState;

  useEffect(() => {
    if (!svgRef.current || !grid.length) return;

    const svg = d3.select(svgRef.current);
    const rows = grid.length;
    const cols = grid[0].length;
    const gap = 4;
    const width = cols * (cellSize + gap) - gap;
    const height = rows * (cellSize + gap) - gap;

    svg
      .attr('viewBox', `0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .attr('width', '100%')
      .attr('height', '100%');
    svg.selectAll('*').remove();

    // 根容器 <g>：所有单元格挂在此，zoom 作用于它
    const root = svg.append('g');

    const cellData = grid.flatMap((row, r) =>
      row.map((state, c) => {
        const info = cellInfoGrid?.[r]?.[c];
        return { r, c, state, infectionTime: info?.infectionTime };
      })
    );

    const cells = root.selectAll('g')
      .data(cellData)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.c * (cellSize + gap)}, ${d.r * (cellSize + gap)})`);

    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', Math.max(4, cellSize * 0.12))
      .attr('fill', d => COLORS[d.state])
      .attr('stroke', d => {
        // 优先级：当前源格子 > 新感染(波次色环) > 默认透明
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return '#60a5fa';
        if (isNewlyRotten(d.r, d.c, newlyRotten) && waveColor) return waveColor;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return '#fbbf24';
        return 'transparent';
      })
      .attr('stroke-width', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return 4;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return 3;
        return 0;
      })
      .style('filter', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return 'drop-shadow(0 0 8px #60a5fa)';
        if (isNewlyRotten(d.r, d.c, newlyRotten) && waveColor) return `drop-shadow(0 0 8px ${waveColor})`;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return 'drop-shadow(0 0 8px #fbbf24)';
        return 'none';
      })
      .style('animation', d => {
        // 仅 INFECT step 的"即将被感染"格子闪烁；用 CSS animation 而非 d3 transition，
        // 元素随 step 切换全量重绘时一并销毁，无残留定时器。
        if (pendingInfect && pendingInfect.some(c => c.row === d.r && c.col === d.c)) {
          return 'infectionFlash 0.5s ease-in-out infinite';
        }
        return 'none';
      });

    cells.filter(d => d.state !== CellState.EMPTY)
      .append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + cellSize * 0.14)
      .attr('text-anchor', 'middle')
      .attr('font-size', cellSize * 0.4)
      .text('🍊');

    if (showCoordinates) {
      cells.append('text')
        .attr('x', 4)
        .attr('y', 11)
        .attr('font-size', Math.max(7, cellSize * 0.14))
        .attr('fill', '#9ca3af')
        .attr('font-family', 'monospace')
        .text(d => `${d.r},${d.c}`);
    }

    if (showInfectionTime) {
      cells.filter(d => d.state === CellState.ROTTEN && d.infectionTime !== undefined && d.infectionTime > 0)
        .append('text')
        .attr('x', cellSize - 4)
        .attr('y', cellSize - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(8, cellSize * 0.15))
        .attr('font-weight', 'bold')
        .attr('fill', '#fbbf24')
        .text(d => `t${d.infectionTime}`);
    }

    cells.filter(d => d.state === CellState.ROTTEN && (d.infectionTime === 0 || d.infectionTime === undefined))
      .append('text')
      .attr('x', cellSize - 4)
        .attr('y', cellSize - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', Math.max(7, cellSize * 0.13))
        .attr('fill', '#ef4444')
        .text('初始');

    // 方向箭头：从当前源格子指向正在感染的目标格子，让用户看清"从哪感染到哪"
    if (currentCell && targetCell) {
      const cx = currentCell.col * (cellSize + gap) + cellSize / 2;
      const cy = currentCell.row * (cellSize + gap) + cellSize / 2;
      const tx = targetCell.col * (cellSize + gap) + cellSize / 2;
      const ty = targetCell.row * (cellSize + gap) + cellSize / 2;
      // 缩短箭头两端，避免压在格子中心
      const dx = tx - cx, dy = ty - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ux = dx / len, uy = dy / len;
      const x1 = cx + ux * (cellSize * 0.35);
      const y1 = cy + uy * (cellSize * 0.35);
      const x2 = tx - ux * (cellSize * 0.35);
      const y2 = ty - uy * (cellSize * 0.35);
      const arrowColor = waveColor || '#fbbf24';
      const defs = root.append('defs');
      const marker = defs.append('marker')
        .attr('id', 'dir-arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 8).attr('refY', 0)
        .attr('markerWidth', 6).attr('markerHeight', 6)
        .attr('orient', 'auto');
      marker.append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', arrowColor);
      root.append('line')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', arrowColor)
        .attr('stroke-width', Math.max(2, cellSize * 0.08))
        .attr('stroke-linecap', 'round')
        .attr('marker-end', 'url(#dir-arrow)')
        .style('filter', `drop-shadow(0 0 4px ${arrowColor})`);
    }

    // d3.zoom：滚轮缩放 + 拖拽平移，作用于 root <g>
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoom);
  }, [grid, cellInfoGrid, newlyRotten, currentCell, cellSize, showCoordinates, showInfectionTime, waveColor, targetCell, pendingInfect]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg ref={svgRef} style={{ maxWidth: '100%', maxHeight: '100%' }} />
    </div>
  );
}
