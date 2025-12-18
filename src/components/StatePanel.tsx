import { AlgorithmPhase } from '../algorithm/types';

interface StatePanelProps {
  minute: number;
  freshCount: number;
  rottenCount: number;
  emptyCount?: number;
  totalCells?: number;
  initialFreshCount?: number;
  infectedThisMinute?: number;
  bfsWave?: number;
  phase?: AlgorithmPhase;
  isComplete: boolean;
  result: number;
  description: string;
}

export function StatePanel({ 
  minute, 
  freshCount, 
  rottenCount, 
  emptyCount = 0,
  totalCells = 0,
  initialFreshCount = 0,
  infectedThisMinute = 0,
  bfsWave = 0,
  phase = AlgorithmPhase.INIT,
  isComplete, 
  result, 
  description 
}: StatePanelProps) {
  // 计算感染进度：已感染的橘子数 / 初始新鲜橘子数
  // 在初始化阶段（INIT），进度始终为 0%
  // 只有在 BFS 阶段才计算实际进度
  let progress = 0;
  if (phase !== AlgorithmPhase.INIT && initialFreshCount > 0) {
    const infectedCount = initialFreshCount - freshCount;
    progress = Math.round((infectedCount / initialFreshCount) * 100);
  }

  const statStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #374151',
    fontSize: '13px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  return (
    <div style={{ 
      background: '#1f2937', 
      borderRadius: '8px', 
      padding: '12px',
      height: '100%',
      overflow: 'auto',
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#60a5fa', fontSize: '14px' }}>📊 算法状态</h3>
      
      {/* 时间和波次 */}
      <div style={statStyle}>
        <span style={labelStyle}>⏱ 当前分钟 / BFS 波次</span>
        <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '16px' }}>
          {minute} / {bfsWave}
        </span>
      </div>
      
      {/* 单元格统计 */}
      <div style={{ 
        padding: '8px 0', 
        borderBottom: '1px solid #374151',
      }}>
        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>
          单元格统计 (总计: {totalCells})
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <StatBadge icon="⬜" label="空" value={emptyCount} color="#6b7280" />
          <StatBadge icon="🍊" label="新鲜" value={freshCount} color="#f97316" />
          <StatBadge icon="🟤" label="腐烂" value={rottenCount} color="#92400e" />
        </div>
      </div>
      
      {/* 感染进度 */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid #374151' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '6px',
        }}>
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>感染进度</span>
          <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{progress}%</span>
        </div>
        <div style={{ 
          height: '8px', 
          background: '#374151', 
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #22c55e, #16a34a)',
            borderRadius: '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
      
      {/* 本轮感染数 */}
      {infectedThisMinute > 0 && (
        <div style={statStyle}>
          <span style={labelStyle}>🔥 本轮感染</span>
          <span style={{ 
            color: '#ef4444', 
            fontWeight: 'bold',
            padding: '2px 8px',
            background: '#ef444420',
            borderRadius: '4px',
          }}>
            +{infectedThisMinute}
          </span>
        </div>
      )}
      
      {/* 最终结果 */}
      {isComplete && (
        <div style={{ 
          marginTop: '12px', 
          padding: '12px', 
          background: result === -1 ? '#7f1d1d' : '#14532d',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '12px', marginBottom: '4px', opacity: 0.8 }}>最终结果</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {result === -1 ? '-1 (无解)' : `${result} 分钟`}
          </div>
        </div>
      )}
      
      {/* 描述 */}
      <div style={{ 
        marginTop: '12px', 
        padding: '10px', 
        background: '#374151',
        borderRadius: '6px',
        fontSize: '12px',
        lineHeight: '1.5',
      }}>
        💡 {description}
      </div>
    </div>
  );
}

function StatBadge({ icon, label, value, color }: { 
  icon: string; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      background: '#111827',
      borderRadius: '4px',
      fontSize: '12px',
    }}>
      <span>{icon}</span>
      <span style={{ color: '#9ca3af' }}>{label}:</span>
      <span style={{ color, fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}
