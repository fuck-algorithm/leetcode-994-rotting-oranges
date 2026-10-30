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
  const { grid, cellInfoGrid, newlyRotten, currentCell, waveColor, targetCell, pendingInfect, checkingDirection, phase } = gridState;

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
    // 根容器只创建一次；按坐标稳定复用单元格，切步时不重建整张画布。
    const root = svg.selectAll<SVGGElement, null>('.grid-root')
      .data([null])
      .join('g')
      .attr('class', 'grid-root');

    const cellData = grid.flatMap((row, r) =>
      row.map((state, c) => {
        const info = cellInfoGrid?.[r]?.[c];
        return { id: `${r}-${c}`, r, c, state, infectionTime: info?.infectionTime };
      })
    );

    const existingCells = root.selectAll<SVGGElement, typeof cellData[number]>('g.grid-cell');
    existingCells.interrupt('cell-enter').interrupt('cell-exit');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const enterDuration = reducedMotion ? 0 : 160;
    const exitDuration = reducedMotion ? 0 : 120;
    const cellJoin = existingCells
      .data(cellData, d => d.id)
      .join(
        enter => {
          const cell = enter.append('g').attr('class', 'grid-cell').attr('opacity', 0);
          cell.append('rect');
          cell.append('text').attr('class', 'orange-icon');
          cell.append('text').attr('class', 'coordinates');
          cell.append('text').attr('class', 'infection-time');
          return cell;
        },
        update => update,
        exit => exit.transition('cell-exit').duration(exitDuration).attr('opacity', 0).on('end', function () { d3.select(this).remove(); })
      )
      .attr('data-cell-id', d => d.id)
      .attr('transform', d => `translate(${d.c * (cellSize + gap)}, ${d.r * (cellSize + gap)})`)
      .transition('cell-enter').duration(enterDuration).attr('opacity', 1)
      .on('end', function () { d3.select(this).attr('data-entering', null); });

    const cells = cellJoin.selection();
    cells.select('rect')
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
        // 周期 0.7s 与 🍊 图标的 infectionPulse 同步，双重视觉信号。
        if (pendingInfect && pendingInfect.some(c => c.row === d.r && c.col === d.c)) {
          return 'infectionFlash 0.7s ease-in-out infinite';
        }
        return 'none';
      });

    cells.select<SVGTextElement>('.orange-icon')
      .style('display', d => d.state === CellState.EMPTY ? 'none' : '')
      .attr('x', cellSize / 2)
      .attr('y', cellSize / 2 + cellSize * 0.14)
      .attr('text-anchor', 'middle')
      .attr('font-size', cellSize * 0.4)
      .text('🍊')
      .style('transform-box', 'fill-box')
      .style('transform-origin', 'center')
      .style('animation', d => {
        // 即将被感染的格子，🍊 图标缩放呼吸，与 rect 的 infectionFlash 叠加，
        // 让用户从"颜色闪烁 + 图标缩放"双重信号意识到"这些是即将被感染的橘子"
        if (pendingInfect && pendingInfect.some(c => c.row === d.r && c.col === d.c)) {
          return 'infectionPulse 0.7s ease-in-out infinite';
        }
        return 'none';
      });

    cells.select<SVGTextElement>('.coordinates')
      .style('display', showCoordinates ? '' : 'none')
      .attr('x', 4)
      .attr('y', 11)
      .attr('font-size', Math.max(7, cellSize * 0.14))
      .attr('fill', '#9ca3af')
      .attr('font-family', 'monospace')
      .text(d => `${d.r},${d.c}`);

    cells.select<SVGTextElement>('.infection-time')
      .style('display', d => showInfectionTime && d.state === CellState.ROTTEN ? '' : 'none')
      .attr('x', cellSize - 4)
      .attr('y', cellSize - 4)
      .attr('text-anchor', 'end')
      .attr('font-size', Math.max(7, cellSize * 0.15))
      .attr('font-weight', 'bold')
      .attr('fill', d => d.infectionTime && d.infectionTime > 0 ? '#fbbf24' : '#ef4444')
      .text(d => d.infectionTime && d.infectionTime > 0 ? `t${d.infectionTime}` : '初始');

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
      const arrowOverlay = root.selectAll<SVGGElement, number>('.direction-overlay')
        .data([0])
        .join(enter => {
          const group = enter.append('g').attr('class', 'direction-overlay');
          group.append('defs').append('marker')
            .attr('id', 'dir-arrow')
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 8).attr('refY', 0)
            .attr('markerWidth', 6).attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path').attr('d', 'M0,-5L10,0L0,5');
          group.append('line');
          group.append('text');
          return group;
        });
      arrowOverlay.select('marker path').attr('fill', arrowColor);
      arrowOverlay.select('line')
        .attr('x1', x1).attr('y1', y1)
        .attr('x2', x2).attr('y2', y2)
        .attr('stroke', arrowColor)
        .attr('stroke-width', Math.max(2, cellSize * 0.08))
        .attr('stroke-linecap', 'round')
        .attr('marker-end', 'url(#dir-arrow)')
        .style('filter', `drop-shadow(0 0 4px ${arrowColor})`);

      const directionNames = { up: '向上', down: '向下', left: '向左', right: '向右' };
      const arrowLabel = phase === 'infect'
        ? `${directionNames[checkingDirection || 'right']}感染 [${targetCell.row},${targetCell.col}]`
        : `从 [${currentCell.row},${currentCell.col}] 检查邻格`;
      arrowOverlay.select('text')
        .style('display', '')
        .attr('x', (cx + tx) / 2)
        .attr('y', (cy + ty) / 2 - 8)
        .attr('text-anchor', 'middle')
        .attr('font-size', Math.max(10, cellSize * 0.18))
        .attr('font-weight', 'bold')
        .attr('fill', '#fff')
        .attr('stroke', '#111827')
        .attr('stroke-width', 3)
        .attr('paint-order', 'stroke')
        .text(arrowLabel);
    }

    if (!currentCell || !targetCell) {
      root.select('.direction-overlay').select('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 0);
      root.select('.direction-overlay').select('text').style('display', 'none');
    }

    // d3.zoom：滚轮缩放 + 拖拽平移，作用于 root <g>
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        root.attr('transform', event.transform.toString());
      });
    svg.call(zoom);
    return () => {
      svg.on('.zoom', null);
      root.selectAll('*').interrupt();
    };
  }, [grid, cellInfoGrid, newlyRotten, currentCell, cellSize, showCoordinates, showInfectionTime, waveColor, targetCell, pendingInfect, checkingDirection, phase]);

  const phaseHint = gridState.phase === 'infect'
    ? `本轮新增 ${gridState.infectedThisMinute} 个腐烂橘子；它们将在下一分钟继续扩散。`
    : gridState.phase === 'bfs_loop'
      ? `队列中的橘子按先进先出处理；同一轮开始时的橘子属于同一分钟。`
      : gridState.phase === 'complete'
        ? (gridState.freshCount === 0 ? `全部橘子已感染，共用时 ${gridState.minute} 分钟。` : `队列已空，仍有 ${gridState.freshCount} 个新鲜橘子无法到达。`)
        : '先扫描网格：把所有初始腐烂橘子加入队列，作为第 0 分钟的扩散源。';

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <svg ref={svgRef} role="img" aria-label={`腐烂橘子网格动画，第 ${gridState.minute} 分钟`} style={{ maxWidth: '100%', maxHeight: 'calc(100% - 58px)' }} />
      <div style={{ width: 'min(100%, 620px)', display: 'grid', gap: 5, fontSize: 11, color: '#d1d5db' }}>
        <div aria-live="polite" style={{ padding: '6px 10px', borderRadius: 6, background: '#1f2937', borderLeft: `3px solid ${gridState.waveColor || '#f59e0b'}` }}>
          <strong style={{ color: '#fbbf24' }}>第 {gridState.minute} 分钟 · {gridState.phase === 'infect' ? '本轮感染' : gridState.phase === 'complete' ? '搜索结束' : 'BFS 扩散'}</strong>
          <span className="operation-badge" data-operation={gridState.operation} style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 10, background: '#334155', color: '#e2e8f0', fontSize: 10 }}>{gridState.operation}</span>
          <span className="step-narration" style={{ display: 'block', marginTop: 4 }}>{gridState.narration || phaseHint}</span>
        </div>
        <div aria-label="网格图例" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', color: '#9ca3af' }}>
          <span>⬛ 空格：不可传播</span><span>🍊 新鲜：等待感染</span><span>🟤 腐烂：可向四邻扩散</span>
          <span>发光边框：当前源 / 本轮新感染</span><span>tN：第 N 分钟感染</span>
        </div>
      </div>
    </div>
  );
}
