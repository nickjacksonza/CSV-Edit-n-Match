export interface Column {
  id: string;
  originalIndex: number;
  originalName: string;
  newName: string;
  width?: number;
}

export interface CsvData {
  headers: string[];
  rows: string[][];
}

export interface PotentialMatch {
  sourceColumn: string;
  referenceColumn: string;
  reason: string;
}
