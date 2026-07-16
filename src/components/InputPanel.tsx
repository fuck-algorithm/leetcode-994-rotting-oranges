import { useState } from 'react';
import { CellState } from '../algorithm/types';
import { parseGrid } from '../utils/gridParser';
import { PRESETS } from '../utils/presets';

interface InputPanelProps {
  onGridChange: (grid: CellState[][]) => void;
}

// 生成随机网格
function generateRandomGrid(rows: number, cols: number): CellState[][] {
  const grid: CellState[][] = [];
  let hasRotten = false;
  let hasFresh = false;
  
  for (let r = 0; r < rows; r++) {
    const row: CellState[] = [];
    for (let c = 0; c < cols; c++) {
      // 随机生成: 0(空) 20%, 1(新鲜) 50%, 2(腐烂) 30%
      const rand = Math.random();
      if (rand < 0.2) {
        row.push(CellState.EMPTY);
      } else if (rand < 0.7) {
        row.push(CellState.FRESH);
        hasFresh = true;
      } else {
        row.push(CellState.ROTTEN);
        hasRotten = true;
      }
    }
    grid.push(row);
  }
  
  // 确保至少有一个腐烂橘子和一个新鲜橘子
  if (!hasRotten && rows > 0 && cols > 0) {
    grid[0][0] = CellState.ROTTEN;
  }
  if (!hasFresh && rows > 0 && cols > 1) {
    grid[0][cols - 1] = CellState.FRESH;
  }
  
  return grid;
}

// 将网格转换为字符串格式
function gridToString(grid: CellState[][]): string {
  return '[' + grid.map(row => '[' + row.join(',') + ']').join(',') + ']';
}


export function InputPanel({ onGridChange }: InputPanelProps) {
  const [input, setInput] = useState('[[2,1,1],[1,1,0],[0,1,1]]');
  const [error, setError] = useState('');
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);

  const handleSubmit = () => {
    const grid = parseGrid(input);
    if (grid) {
      setError('');
      onGridChange(grid);
    } else {
      setError('无效的网格格式，请使用 [[2,1,1],[1,1,0],[0,1,1]] 格式');
    }
  };

  const handleRandom = () => {
    const grid = generateRandomGrid(rows, cols);
    const gridStr = gridToString(grid);
    setInput(gridStr);
    setError('');
    onGridChange(grid);
  };

  const btnStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    background: '#4b5563',
    color: 'white',
    fontSize: '13px',
    transition: 'background 0.2s',
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #4b5563',
    background: '#374151',
    color: 'white',
    fontSize: '13px',
  };

  const labelStyle: React.CSSProperties = {
    color: '#9ca3af',
    fontSize: '12px',
    marginRight: '4px',
  };

  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '8px',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      {/* 预设用例 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#60a5fa', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>📋 预设:</span>
        {PRESETS.map((preset, i) => (
          <button
            key={i}
            style={{ ...btnStyle, padding: '4px 8px', fontSize: '12px' }}
            onClick={() => {
              onGridChange(preset.grid);
              setInput(gridToString(preset.grid));
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#6b7280')}
            onMouseLeave={e => (e.currentTarget.style.background = '#4b5563')}
          >
            {preset.name}({preset.expectedResult})
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '20px', background: '#4b5563' }} />

      {/* 随机生成 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>🎲</span>
        <label style={labelStyle}>行</label>
        <input
          type="number"
          min={1}
          max={10}
          value={rows}
          onChange={e => setRows(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
          style={{ ...inputStyle, width: '40px', textAlign: 'center', padding: '4px 6px' }}
        />
        <label style={labelStyle}>列</label>
        <input
          type="number"
          min={1}
          max={30}
          value={cols}
          onChange={e => setCols(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
          style={{ ...inputStyle, width: '40px', textAlign: 'center', padding: '4px 6px' }}
        />
        <button
          style={{ ...btnStyle, background: '#22c55e', padding: '4px 8px', fontSize: '12px' }}
          onClick={handleRandom}
          onMouseEnter={e => (e.currentTarget.style.background = '#16a34a')}
          onMouseLeave={e => (e.currentTarget.style.background = '#22c55e')}
        >
          随机
        </button>
      </div>

      {/* 分隔线 */}
      <div style={{ width: '1px', height: '20px', background: '#4b5563' }} />

      {/* 自定义输入 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1, minWidth: '200px' }}>
        <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '12px', whiteSpace: 'nowrap' }}>✏️</span>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="[[2,1,1],[1,1,0],[0,1,1]]"
          style={{ ...inputStyle, flex: 1, padding: '4px 8px' }}
        />
        <button
          style={{ ...btnStyle, background: '#3b82f6', padding: '4px 10px', fontSize: '12px' }}
          onClick={handleSubmit}
          onMouseEnter={e => (e.currentTarget.style.background = '#2563eb')}
          onMouseLeave={e => (e.currentTarget.style.background = '#3b82f6')}
        >
          加载
        </button>
      </div>

      {/* 格式说明 — 合并到同一行末尾 */}
      <span style={{ color: '#6b7280', fontSize: '10px', whiteSpace: 'nowrap' }}>
        💡 0=空 1=新鲜🍊 2=腐烂🟤
      </span>

      {/* 错误提示 — 仅出错时占一行 */}
      {error && (
        <div style={{
          width: '100%',
          color: '#ef4444',
          fontSize: '12px',
          background: '#7f1d1d20',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #7f1d4040',
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
