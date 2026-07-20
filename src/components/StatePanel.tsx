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

  return (
    <div style={{
      background: '#1f2937',
      borderRadius: '8px',
      padding: '8px',
      height: '100%',
      overflow: 'auto',
    }}>
      {/* 当前步骤叙事摘要 — 用户第一眼看到的"这一步在做什么" */}
      <div style={{
        background: '#0f172a',
        border: '1px solid #1e3a8a',
        borderRadius: '6px',
        padding: '8px',
        marginBottom: '8px',
        fontSize: '12px',
        lineHeight: '1.5',
        color: '#e5e7eb',
      }}>
        <div style={{ fontSize: '10px', color: '#60a5fa', marginBottom: '4px', letterSpacing: '0.5px' }}>
          📖 当前步骤
        </div>
        {description}
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <h3 style={{ margin: 0, color: '#60a5fa', fontSize: '13px' }}>📊 算法状态</h3>
        <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>
          {minute} / {bfsWave}
        </span>
      </div>

      {/* 单元格统计 — 紧凑 badge 横排 */}
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px', alignItems: 'center' }}>
        <StatBadge icon="⬜" label="空" value={emptyCount} color="#6b7280" />
        <StatBadge icon="🍊" label="鲜" value={freshCount} color="#f97316" />
        <StatBadge icon="🟤" label="腐" value={rottenCount} color="#92400e" />
        <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: 'auto' }}>共{totalCells}</span>
      </div>

      {/* 感染进度 — 渐变轨道 + 光泽流动，自定义样式不靠原生 progress */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>感染进度</span>
          <span style={{
            color: progress === 100 ? '#22c55e' : '#fbbf24',
            fontWeight: 'bold',
            fontSize: '13px',
            textShadow: progress === 100 ? '0 0 6px rgba(34,197,94,0.6)' : 'none',
            transition: 'all 0.3s ease',
          }}>{progress}%</span>
        </div>
        <div style={{
          position: 'relative',
          height: '8px',
          background: 'linear-gradient(90deg, #1f2937, #374151)',
          borderRadius: '4px',
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #f97316 0%, #f59e0b 50%, #22c55e 100%)',
            borderRadius: '4px',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 6px rgba(251, 191, 36, 0.5)',
          }}>
            {/* 光泽流动高光层 */}
            {progress > 0 && progress < 100 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '40%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                animation: 'progressShine 2s ease-in-out infinite',
              }} />
            )}
          </div>
        </div>
      </div>

      {/* 本轮感染 */}
      {infectedThisMinute > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '3px 0',
          fontSize: '12px',
        }}>
          <span>🔥 本轮感染</span>
          <span style={{
            color: '#ef4444',
            fontWeight: 'bold',
            padding: '1px 6px',
            background: '#ef444420',
            borderRadius: '3px',
          }}>
            +{infectedThisMinute}
          </span>
        </div>
      )}

      {/* 最终结果 */}
      {isComplete && (
        <div style={{
          marginTop: '6px',
          padding: '8px',
          background: result === -1 ? '#7f1d1d' : '#14532d',
          borderRadius: '6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '11px', marginBottom: '2px', opacity: 0.8 }}>最终结果</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            {result === -1 ? '-1 (无解)' : `${result} 分钟`}
          </div>
        </div>
      )}

      {/* 描述 */}
      <div style={{
        marginTop: '6px',
        padding: '6px',
        background: '#374151',
        borderRadius: '4px',
        fontSize: '11px',
        lineHeight: '1.4',
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
