// Score conversion tables (primary scores → 100-point scale)
// Source: РИКЗ Belarus approximate tables

export const mathScoreTable: Record<number, number> = {
  32: 100, 31: 98, 30: 96, 29: 94, 28: 91, 27: 88,
  26: 85, 25: 82, 24: 79, 23: 76, 22: 73, 21: 70,
  20: 67, 19: 64, 18: 61, 17: 58, 16: 55, 15: 52,
  14: 49, 13: 46, 12: 43, 11: 40, 10: 37, 9: 34,
  8: 31, 7: 28, 6: 25, 5: 22, 4: 18, 3: 14, 2: 10, 1: 6, 0: 0,
};

export const physicsScoreTable: Record<number, number> = {
  35: 100, 34: 98, 33: 95, 32: 92, 31: 89, 30: 86, 29: 83,
  28: 80, 27: 77, 26: 74, 25: 71, 24: 68, 23: 65, 22: 62,
  21: 59, 20: 56, 19: 53, 18: 50, 17: 47, 16: 44, 15: 41,
  14: 38, 13: 35, 12: 32, 11: 29, 10: 26, 9: 23, 8: 20,
  7: 17, 6: 14, 5: 11, 4: 8, 3: 5, 2: 3, 1: 1, 0: 0,
};

export const defaultScoreTable = (maxPrimary: number): Record<number, number> => {
  const table: Record<number, number> = { 0: 0 };
  for (let i = 1; i <= maxPrimary; i++) {
    table[i] = Math.round((i / maxPrimary) * 100);
  }
  return table;
};

export function convertScore(primaryScore: number, subjectSlug: string, totalQuestions: number): number {
  let table: Record<number, number>;
  if (subjectSlug === 'math') table = mathScoreTable;
  else if (subjectSlug === 'physics') table = physicsScoreTable;
  else table = defaultScoreTable(totalQuestions);

  return table[primaryScore] ?? Math.round((primaryScore / totalQuestions) * 100);
}
