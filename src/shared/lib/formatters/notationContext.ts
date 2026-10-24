export type NumberNotation = 'compact' | 'scientific';

let currentNotation: NumberNotation = 'compact';

export function getGlobalNotation(): NumberNotation {
  return currentNotation;
}

export function setGlobalNotation(notation: NumberNotation): void {
  currentNotation = notation;
}
