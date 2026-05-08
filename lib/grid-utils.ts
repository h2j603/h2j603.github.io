/**
 * Splits a title into exactly `gridSize` cells. Each character (KR or EN) gets
 * one cell; whitespace counts. If the string exceeds gridSize, the (gridSize-1)th
 * cell holds the original character and the last cell becomes an ellipsis.
 * Otherwise the trailing cells are empty strings.
 */
export function splitTitleIntoCells(title: string, gridSize: number): string[] {
  const chars = Array.from(title);
  if (chars.length <= gridSize) {
    return [...chars, ...Array(gridSize - chars.length).fill('')];
  }
  return [...chars.slice(0, gridSize - 1), '…'];
}

/**
 * Returns the column index (0-based, from left) for the n-th work on a page.
 * Works fill from the rightmost column toward the left.
 */
export function columnForWork(workIndexOnPage: number, gridSize: number): number {
  return gridSize - 1 - workIndexOnPage;
}

/**
 * Paginates the works array; each page holds at most gridSize works.
 */
export function paginateWorks<T>(works: T[], gridSize: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < works.length; i += gridSize) {
    pages.push(works.slice(i, i + gridSize));
  }
  return pages.length > 0 ? pages : [[]];
}
