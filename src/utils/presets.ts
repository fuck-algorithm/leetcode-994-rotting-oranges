import { CellState } from '../algorithm/types';

export interface PresetExample {
  name: string;
  grid: CellState[][];
  expectedResult: number;
}

export const PRESETS: PresetExample[] = [
  {
    name: '示例 1',
    grid: [
      [2, 1, 1],
      [1, 1, 0],
      [0, 1, 1],
    ],
    expectedResult: 4,
  },
  {
    name: '示例 2 (无解)',
    grid: [
      [2, 1, 1],
      [0, 1, 1],
      [1, 0, 1],
    ],
    expectedResult: -1,
  },
  {
    name: '示例 3',
    grid: [
      [0, 2],
    ],
    expectedResult: 0,
  },
];
