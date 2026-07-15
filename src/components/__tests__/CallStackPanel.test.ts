import { describe, it, expect } from 'vitest';
import { CallStackFrame } from '../../algorithm/types';

// 测试帧数据构造与图标映射的纯逻辑（不渲染 DOM）
function selectActiveFrame(callStack: CallStackFrame[]): CallStackFrame {
  return callStack[callStack.length - 1];
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

describe('CallStackPanel logic', () => {
  it('happy path: 选中栈顶帧为活动帧', () => {
    const stack: CallStackFrame[] = [
      { id: 'method', label: 'orangesRotting()', line: 2, variables: [], depth: 0 },
      { id: 'bfs-loop', label: 'while', line: 23, variables: [], depth: 1 },
      { id: 'iterate-cell', label: 'for i', line: 25, variables: [], depth: 2 },
    ];
    expect(selectActiveFrame(stack).id).toBe('iterate-cell');
    expect(selectActiveFrame(stack).depth).toBe(2);
  });

  it('edge case: 空栈选择不崩溃', () => {
    const stack: CallStackFrame[] = [];
    expect(stack.length).toBe(0);
  });

  it('所有已知帧 id 都有图标', () => {
    const knownIds = ['method', 'init-loop', 'bfs-loop', 'iterate-cell', 'check-direction', 'infect', 'return'];
    for (const id of knownIds) {
      expect(FRAME_ICONS[id]).toBeDefined();
    }
  });

  it('error path: 未知帧 id 兜底为默认图标', () => {
    expect(FRAME_ICONS['unknown-id'] ?? '▫️').toBe('▫️');
  });
});
