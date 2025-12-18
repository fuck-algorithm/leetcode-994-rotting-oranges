import { Cell } from '../algorithm/types';

interface QueuePanelProps {
  queue: Cell[];
  newlyAdded?: Cell[];
}

export function QueuePanel({ queue, newlyAdded = [] }: QueuePanelProps) {
  const isNewlyAdded = (cell: Cell) => {
    return newlyAdded.some(c => c.row === cell.row && c.col === cell.col);
  };

  return (
    <div style={{ 
      background: '#1f2937', 
      borderRadius: '8px', 
      padding: '12px',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '14px' }}>📦 BFS 队列</h3>
        <span style={{
          padding: '2px 8px',
          background: '#3b82f620',
          borderRadius: '4px',
          color: '#60a5fa',
          fontSize: '12px',
        }}>
          长度: {queue.length}
        </span>
      </div>
      
      {queue.length === 0 ? (
        <div style={{ 
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6b7280', 
          border: '2px dashed #374151',
          borderRadius: '6px',
        }}>
          📭 队列为空
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {queue.map((cell, i) => {
              const isFirst = i === 0;
              const isNew = isNewlyAdded(cell);
              return (
                <div
                  key={`${cell.row}-${cell.col}-${i}`}
                  style={{
                    background: isFirst ? '#fbbf2420' : isNew ? '#22c55e20' : '#374151',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    border: isFirst ? '2px solid #fbbf24' : isNew ? '2px solid #22c55e' : '2px solid transparent',
                    color: isFirst ? '#fbbf24' : isNew ? '#22c55e' : '#e5e7eb',
                  }}
                >
                  [{cell.row},{cell.col}]
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {queue.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af', display: 'flex', gap: '12px' }}>
          <span>🟡 队首</span>
          <span>🟢 新入队</span>
        </div>
      )}
    </div>
  );
}
