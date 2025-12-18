import { VariableValue } from '../algorithm/types';

interface CodePanelProps {
  highlightedLines: number[];
  variables?: VariableValue[];
}

const JAVA_CODE = `class Solution {
    public int orangesRotting(int[][] grid) {
        int M = grid.length;
        int N = grid[0].length;
        Queue<int[]> queue = new LinkedList<>();
        int fresh = 0;
        
        // 初始化：统计新鲜橘子，腐烂橘子入队
        for (int r = 0; r < M; r++) {
            for (int c = 0; c < N; c++) {
                if (grid[r][c] == 1) {
                    fresh++;
                } else if (grid[r][c] == 2) {
                    queue.add(new int[]{r, c});
                }
            }
        }
        
        int minutes = 0;
        int[][] dirs = {{-1,0},{1,0},{0,-1},{0,1}};
        
        // BFS 主循环
        while (!queue.isEmpty() && fresh > 0) {
            int size = queue.size();
            for (int i = 0; i < size; i++) {
                int[] cell = queue.poll();
                int r = cell[0], c = cell[1];
                
                // 检查四个方向的相邻单元格
                for (int[] dir : dirs) {
                    int nr = r + dir[0];
                    int nc = c + dir[1];
                    
                    if (nr >= 0 && nr < M && nc >= 0 && nc < N 
                        && grid[nr][nc] == 1) {
                        grid[nr][nc] = 2;
                        fresh--;
                        queue.add(new int[]{nr, nc});
                    }
                }
            }
            minutes++;
        }
        
        return fresh == 0 ? minutes : -1;
    }
}`;

const lines = JAVA_CODE.split('\n');

// 语法高亮的颜色配置 (VS Code Dark+ 主题风格)
const COLORS = {
  keyword: '#c586c0',      // 紫色 - class, public, int, for, while, if, else, return, new
  type: '#4ec9b0',         // 青色 - Queue, LinkedList, Solution
  number: '#b5cea8',       // 浅绿色 - 数字
  string: '#ce9178',       // 橙色 - 字符串
  comment: '#6a9955',      // 绿色 - 注释
  method: '#dcdcaa',       // 黄色 - 方法名
  variable: '#9cdcfe',     // 浅蓝色 - 变量
  operator: '#d4d4d4',     // 白色 - 操作符
  bracket: '#ffd700',      // 金色 - 括号
  default: '#d4d4d4',      // 默认白色
};

export function CodePanel({ highlightedLines, variables = [] }: CodePanelProps) {
  // 创建变量行映射
  const variablesByLine: Record<number, VariableValue[]> = {};
  for (const v of variables) {
    if (!variablesByLine[v.line]) {
      variablesByLine[v.line] = [];
    }
    variablesByLine[v.line].push(v);
  }

  return (
    <div style={{ 
      background: '#1e1e1e', 
      borderRadius: '8px', 
      padding: '12px',
      height: '100%',
      overflow: 'auto',
      fontSize: '12px',
      fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Monaco, "Courier New", monospace',
      border: '1px solid #333',
    }}>
      <h3 style={{ 
        margin: '0 0 12px 0', 
        color: '#60a5fa', 
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '16px' }}>☕</span> 
        Java 代码
        <span style={{ 
          marginLeft: 'auto', 
          fontSize: '10px', 
          color: '#888',
          background: '#333',
          padding: '2px 8px',
          borderRadius: '4px',
        }}>
          DEBUG MODE
        </span>
      </h3>
      <pre style={{ margin: 0 }}>
        {lines.map((line, i) => {
          const lineNum = i + 1;
          const isHighlighted = highlightedLines.includes(lineNum);
          const lineVars = variablesByLine[lineNum] || [];
          
          return (
            <div
              key={i}
              style={{
                background: isHighlighted 
                  ? 'linear-gradient(90deg, rgba(255, 255, 0, 0.15) 0%, rgba(255, 255, 0, 0.05) 100%)' 
                  : 'transparent',
                borderLeft: isHighlighted ? '3px solid #ffcc00' : '3px solid transparent',
                paddingLeft: '8px',
                paddingRight: '8px',
                lineHeight: '1.6',
                display: 'flex',
                alignItems: 'center',
                minHeight: '20px',
                position: 'relative',
                transition: 'background 0.2s ease',
              }}
            >
              {/* 断点指示器 */}
              {isHighlighted && (
                <span style={{
                  position: 'absolute',
                  left: '-2px',
                  width: '8px',
                  height: '8px',
                  background: '#ff4444',
                  borderRadius: '50%',
                  boxShadow: '0 0 6px #ff4444',
                }}/>
              )}
              
              {/* 行号 */}
              <span style={{ 
                color: isHighlighted ? '#ffcc00' : '#858585', 
                marginRight: '16px', 
                userSelect: 'none',
                minWidth: '24px',
                textAlign: 'right',
                fontSize: '11px',
              }}>
                {String(lineNum).padStart(2, ' ')}
              </span>
              
              {/* 代码内容 */}
              <span style={{ flex: 1 }}>
                {highlightSyntax(line)}
              </span>
              
              {/* 变量值显示 - Debug 风格 */}
              {lineVars.length > 0 && (
                <span style={{
                  marginLeft: '16px',
                  padding: '2px 10px',
                  background: 'rgba(255, 152, 0, 0.15)',
                  border: '1px solid rgba(255, 152, 0, 0.4)',
                  borderRadius: '4px',
                  color: '#ffb74d',
                  fontSize: '11px',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  animation: 'varPulse 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{ color: '#888', fontSize: '10px' }}>⬤</span>
                  {lineVars.map((v, idx) => (
                    <span key={v.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#9cdcfe' }}>{v.name}</span>
                      <span style={{ color: '#888' }}>=</span>
                      <span style={{ color: '#b5cea8', fontWeight: 600 }}>{v.value}</span>
                      {idx < lineVars.length - 1 && <span style={{ color: '#555' }}>│</span>}
                    </span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </pre>
      <style>{`
        @keyframes varPulse {
          0% { opacity: 0; transform: translateX(-10px); }
          50% { opacity: 1; }
          100% { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function highlightSyntax(line: string): React.ReactNode {
  // 处理注释
  if (line.includes('//')) {
    const idx = line.indexOf('//');
    const before = line.substring(0, idx);
    const comment = line.substring(idx);
    return (
      <>
        {tokenizeLine(before)}
        <span style={{ color: COLORS.comment, fontStyle: 'italic' }}>{comment}</span>
      </>
    );
  }
  
  return tokenizeLine(line);
}

function tokenizeLine(code: string): React.ReactNode {
  if (!code.trim()) return code;
  
  const tokens: { text: string; color: string }[] = [];
  const remaining = code;
  
  // 关键字
  const keywords = ['class', 'public', 'private', 'int', 'for', 'while', 'if', 'else', 'return', 'new', 'void', 'static'];
  // 类型
  const types = ['Queue', 'LinkedList', 'Solution', 'String', 'Integer', 'Boolean'];
  // 方法
  const methods = ['orangesRotting', 'length', 'add', 'poll', 'isEmpty', 'size'];
  
  // 简单的词法分析
  const regex = /(\s+)|(\d+)|([a-zA-Z_][a-zA-Z0-9_]*)|([{}()[\]<>])|([+\-*/%=<>!&|;,.:]+)/g;
  let match;
  let lastIndex = 0;
  
  while ((match = regex.exec(remaining)) !== null) {
    // 添加匹配前的内容
    if (match.index > lastIndex) {
      tokens.push({ text: remaining.slice(lastIndex, match.index), color: COLORS.default });
    }
    
    const [fullMatch, whitespace, number, identifier, bracket, operator] = match;
    
    if (whitespace) {
      tokens.push({ text: whitespace, color: COLORS.default });
    } else if (number) {
      tokens.push({ text: number, color: COLORS.number });
    } else if (identifier) {
      if (keywords.includes(identifier)) {
        tokens.push({ text: identifier, color: COLORS.keyword });
      } else if (types.includes(identifier)) {
        tokens.push({ text: identifier, color: COLORS.type });
      } else if (methods.includes(identifier)) {
        tokens.push({ text: identifier, color: COLORS.method });
      } else {
        tokens.push({ text: identifier, color: COLORS.variable });
      }
    } else if (bracket) {
      tokens.push({ text: bracket, color: COLORS.bracket });
    } else if (operator) {
      tokens.push({ text: operator, color: COLORS.operator });
    } else {
      tokens.push({ text: fullMatch, color: COLORS.default });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // 添加剩余内容
  if (lastIndex < remaining.length) {
    tokens.push({ text: remaining.slice(lastIndex), color: COLORS.default });
  }
  
  return tokens.map((token, i) => (
    <span key={i} style={{ color: token.color }}>{token.text}</span>
  ));
}
