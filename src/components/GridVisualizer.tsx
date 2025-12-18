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
  const { grid, cellInfoGrid, newlyRotten, currentCell } = gridState;

  useEffect(() => {
    if (!svgRef.current || !grid.length) return;

    const svg = d3.select(svgRef.current);
    const rows = grid.length;
    const cols = grid[0].length;
    const gap = 4;
    const width = cols * (cellSize + gap);
    const height = rows * (cellSize + gap);

    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    // 准备数据
    const cellData = grid.flatMap((row, r) => 
      row.map((state, c) => {
        const info = cellInfoGrid?.[r]?.[c];
        return { 
          r, 
          c, 
          state,
          infectionTime: info?.infectionTime,
        };
      })
    );

    const cells = svg.selectAll('g')
      .data(cellData)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.c * (cellSize + gap)}, ${d.r * (cellSize + gap)})`);

    // 背景矩形
    cells.append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('rx', 8)
      .attr('fill', d => COLORS[d.state])
      .attr('stroke', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) {
          return '#60a5fa'; // 当前处理的单元格
        }
        if (isNewlyRotten(d.r, d.c, newlyRotten)) {
          return '#fbbf24'; // 新感染的
        }
        return 'transparent';
      })
      .attr('stroke-width', d => {
        if (currentCell && currentCell.row === d.r && currentCell.col === d.c) return 4;
        if (isNewlyRotten(d.r, d.c, newlyRotten)) return 3;
        return 0;
      })
      .style('filter', d => {
        if (isNewlyRotten(d.r, d.c, newlyRotten)) {
          return 'drop-shadow(0 0 8px #fbbf24)';
        }
        return 'none';
      });

    // 橘子图标
    cells.filter(d => d.state !== CellState.EMPTY)
      .append('text')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', cellSize * 0.4)
      .text('🍊');

    // 坐标显示 (左上角)
    if (showCoordinates) {
      cells.append('text')
        .attr('x', 4)
        .attr('y', 12)
        .attr('font-size', 9)
        .attr('fill', '#9ca3af')
        .attr('font-family', 'monospace')
        .text(d => `${d.r},${d.c}`);
    }

    // 感染时间显示 (右下角，仅对腐烂橘子)
    if (showInfectionTime) {
      cells.filter(d => d.state === CellState.ROTTEN && d.infectionTime !== undefined && d.infectionTime > 0)
        .append('text')
        .attr('x', cellSize - 4)
        .attr('y', cellSize - 4)
        .attr('text-anchor', 'end')
        .attr('font-size', 10)
        .attr('font-weight', 'bold')
        .attr('fill', '#fbbf24')
        .text(d => `t${d.infectionTime}`);
    }

    // 初始腐烂橘子标记 (右下角)
    cells.filter(d => d.state === CellState.ROTTEN && (d.infectionTime === 0 || d.infectionTime === undefined))
      .append('text')
      .attr('x', cellSize - 4)
      .attr('y', cellSize - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', 9)
      .attr('fill', '#ef4444')
      .text('初始');

  }, [grid, cellInfoGrid, newlyRotten, currentCell, cellSize, showCoordinates, showInfectionTime]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg ref={svgRef} />
    </div>
  );
}
