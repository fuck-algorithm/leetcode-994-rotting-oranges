import { useState } from 'react';
import { CallStackFrame, VariableValue } from '../algorithm/types';

interface CallStackPanelProps {
  callStack: CallStackFrame[];
  /** 当前活动帧的 depth（默认栈顶，即最大 depth） */
  activeDepth?: number;
}

const FRAME_ICONS: Record<string, string> = {
  method: '🔵',
  'init-loop': '🔄',
  'bfs-loop': '🔁',
  'iterate-cell': '📍',
  'check-direction': '🧭',
  infect: '🦠',
  return: '↩️',
};

export function CallStackPanel({ callStack, activeDepth }: CallStackPanelProps) {
  const [expandedFrame, setExpandedFrame] = useState<number | null>(
    activeDepth ?? callStack.length - 1
  );

  const activeIdx = activeDepth ?? callStack.length - 1;

  return (
    <div style={{
      background: '#252526',
      borderRadius: '6px',
      padding: '8px',
      border: '1px solid #333',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <h4 style={{ margin: 0, color: '#60a5fa', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📞 调用栈
        </h4>
        <span style={{
          fontSize: '10px',
          color: '#888',
          background: '#333',
          padding: '1px 6px',
          borderRadius: '3px',
        }}>
          {callStack.length} 帧
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: '4px' }}>
        {callStack.map((frame, idx) => {
          const isActive = idx === activeIdx;
          const isExpanded = expandedFrame === idx;
          const indent = frame.depth * 12;
          return (
            <div key={frame.id + frame.depth}>
              <div
                onClick={() => setExpandedFrame(isExpanded ? null : idx)}
                style={{
                  marginLeft: indent,
                  padding: '4px 8px',
                  background: isActive ? '#3b82f630' : '#1e1e1e',
                  borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
              >
                <span>{FRAME_ICONS[frame.id] ?? '▫️'}</span>
                <span style={{ color: isActive ? '#60a5fa' : '#d4d4d4', flex: 1 }}>
                  {frame.label}
                </span>
                {frame.variables.length > 0 && (
                  <span style={{ color: '#888', fontSize: '9px' }}>
                    {isExpanded ? '▼' : '▶'} {frame.variables.length} vars
                  </span>
                )}
              </div>

              {isExpanded && frame.variables.length > 0 && (
                <div style={{
                  marginLeft: indent + 12,
                  marginTop: '2px',
                  marginBottom: '4px',
                  padding: '6px',
                  background: '#1a1a1a',
                  borderRadius: '3px',
                  fontSize: '10px',
                }}>
                  <VariableList variables={frame.variables} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VariableList({ variables }: { variables: VariableValue[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      {variables.map(v => (
        <div key={v.name} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '8px',
          fontFamily: 'monospace',
        }}>
          <span style={{ color: '#9cdcfe' }}>{v.name}</span>
          <span style={{ color: '#888' }}>=</span>
          <span style={{ color: '#b5cea8', fontWeight: 600 }}>{v.value}</span>
        </div>
      ))}
    </div>
  );
}
