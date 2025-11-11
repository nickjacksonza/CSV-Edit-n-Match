import React, { useState, useEffect, useCallback } from 'react';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import { DownloadIcon } from './components/Icons';
import { CsvData, Column } from './types';
import { UndoIcon, AddIcon } from './components/Icons';

type HistoryState = {
  columns: Column[];
  data: CsvData | null;
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface CsvEditorProps {
  storageKey: string;
  instanceNumber: number;
  disableColumnEditing?: boolean;
  disableDownload?: boolean;
  title?: string;
  description?: string;
  columns?: Column[]; // Controlled component: columns passed from parent
  referenceColumns?: Column[] | null;
  onColumnsChange?: (columns: Column[]) => void;
  onDataChange?: (data: CsvData) => void;
}

const CsvEditor: React.FC<CsvEditorProps> = ({ 
  storageKey, 
  instanceNumber, 
  disableColumnEditing = false, 
  disableDownload = false, 
  title, 
  description,
  columns: propColumns,
  referenceColumns = null,
  onColumnsChange,
  onDataChange
}) => {
  const [csvData, setCsvData] = useState<CsvData | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [error, setError] = useState<string>('');
  const [history, setHistory] = useState<HistoryState[]>([]);

  // Effect to sync with parent component's state
  useEffect(() => {
    // Avoid re-setting state if the parent re-renders but the columns are identical
    if (propColumns && JSON.stringify(propColumns) !== JSON.stringify(columns)) {
      setColumns(propColumns);
    }
  }, [propColumns]);


  // Effect to report changes up to the parent
  useEffect(() => {
    if (onColumnsChange) {
      onColumnsChange(columns);
    }
  }, [columns, onColumnsChange]);

  useEffect(() => {
    try {
      const savedStateJSON = localStorage.getItem(storageKey);
      if (savedStateJSON) {
        const savedState: HistoryState = JSON.parse(savedStateJSON);
        if (savedState.data && savedState.columns) {
          setCsvData(savedState.data);
          onDataChange?.(savedState.data);
          // If it's a controlled component, let the parent know about the loaded columns
          if (onColumnsChange) {
            onColumnsChange(savedState.columns);
          } else { // Otherwise, manage it internally
            setColumns(savedState.columns);
          }
        }
      }
    } catch (e) {
      console.error(`Failed to load saved session for ${storageKey}`, e);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, onColumnsChange, onDataChange]);
  
  const addToHistory = useCallback(() => {
    if (!disableColumnEditing) {
      setHistory(prev => [...prev, { columns, data: csvData }]);
    }
  }, [columns, csvData, disableColumnEditing]);

  const handleSetColumns = useCallback((newColumns: Column[] | ((prevState: Column[]) => Column[])) => {
    if (!disableColumnEditing) {
      addToHistory();
      setColumns(newColumns);
    }
  }, [addToHistory, disableColumnEditing]);

  const detectDelimiter = (text: string): string => {
    const delimiters = [',', ';', '\t', '|'];
    const lines = text.split('\n').slice(0, 5); // Check first 5 lines
    let bestDelimiter = ',';
    let maxCount = 0;

    for (const delimiter of delimiters) {
        let currentCount = 0;
        for (const line of lines) {
            currentCount += line.split(delimiter).length - 1;
        }
        if (currentCount > maxCount) {
            maxCount = currentCount;
            bestDelimiter = delimiter;
        }
    }
    return bestDelimiter;
  };

  const parseCsv = (text: string): { headers: string[], rows: string[][] } => {
    const delimiter = detectDelimiter(text);
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') { // Escaped quote
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === delimiter) {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n' || (char === '\r' && text[i+1] === '\n')) {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
                if (char === '\r') i++; // Skip LF
            } else {
                currentField += char;
            }
        }
    }
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        rows.push(currentRow);
    }

    const cleanedRows = rows.map(row => row.map(cell => cell.trim())).filter(row => row.length > 0 && row.some(cell => cell));
    const headers = cleanedRows.shift() || [];
    return { headers, rows: cleanedRows };
  };

  const handleFileLoad = (selectedFile: File) => {
    setError('');
    
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File is too large. Please upload files under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    setHistory([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const { headers, rows } = parseCsv(text);
        
        if (headers.length === 0) {
          setError('Could not parse headers. The file might be empty or in an unsupported format.');
          return;
        }

        const data = { headers, rows };
        const initialColumns = headers.map((header, index) => ({
          id: `col-${index}-${Date.now()}`,
          originalIndex: index,
          originalName: header,
          newName: header,
          width: 150,
        }));
        
        setCsvData(data);
        setColumns(initialColumns);
        onDataChange?.(data);

        if (selectedFile.size < 1024 * 1024) { // 1MB limit for session saving
          localStorage.setItem(storageKey, JSON.stringify({ data, columns: initialColumns }));
        } else {
          localStorage.removeItem(storageKey);
        }
      }
    };
    reader.onerror = () => setError('Failed to read file.');
    reader.readAsText(selectedFile);
  };
  
  const sanitizeForCsvExport = (value: string): string => {
    if (typeof value !== 'string') {
      return value;
    }
    // Check if the string starts with a character that could trigger a formula in a spreadsheet
    if (['=', '+', '-', '@'].includes(value.charAt(0))) {
      return `'${value}`;
    }
    return value;
  };

  const handleDownload = () => {
    if (!csvData) return;
    const headers = columns.map(c => `"${sanitizeForCsvExport(c.newName).replace(/"/g, '""')}"`).join(',');
    const rows = csvData.rows.map(row => 
      columns.map(col => {
          const cellValue = col.originalIndex > -1 ? (row[col.originalIndex] || '') : '';
          const sanitizedValue = sanitizeForCsvExport(cellValue.toString());
          return `"${sanitizedValue.replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `transformed_data_instance_${instanceNumber}.csv`); // Unique filename per instance
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReset = () => {
    setCsvData(null);
    setColumns([]);
    setError('');
    setHistory([]);
    onDataChange?.({headers: [], rows: []});
    localStorage.removeItem(storageKey);
  };

  const handleUndo = () => {
    if (disableColumnEditing || history.length === 0) return;
    const lastState = history[history.length - 1];
    setCsvData(lastState.data);
    setColumns(lastState.columns);
    setHistory(history.slice(0, -1));
  };

  const handleAddNewColumn = () => {
    if (disableColumnEditing) return;
    addToHistory();
    const newColumn: Column = {
      id: `col-new-${Date.now()}`,
      originalIndex: -1,
      originalName: 'New Column',
      newName: 'New Column',
      width: 150,
    };
    setColumns(prev => [...prev, newColumn]);
  };
  
  const handleCloneColumn = (columnId: string) => {
    if (disableColumnEditing) return;
    addToHistory();
    setColumns(prev => {
        const newColumns = [...prev];
        const colIndex = newColumns.findIndex(c => c.id === columnId);
        if(colIndex === -1) return prev;

        const columnToClone = newColumns[colIndex];
        const newColumn: Column = {
            ...columnToClone,
            id: `col-clone-${Date.now()}`,
            newName: `${columnToClone.newName} (Copy)`,
        };
        newColumns.splice(colIndex + 1, 0, newColumn);
        return newColumns;
    });
  };

  const handleDeleteColumn = (columnId: string) => {
    if (disableColumnEditing) return;
    addToHistory();
    setColumns(prev => prev.filter(c => c.id !== columnId));
  };


  useEffect(() => {
    if (csvData) {
      const currentState = { data: csvData, columns };
      // Check file size before saving to local storage again
      const savedStateJSON = localStorage.getItem(storageKey);
      if (savedStateJSON) {
        const savedFileSize = JSON.stringify(savedStateJSON).length;
        if (savedFileSize < 1024 * 1024) { // Only update if it was saved before (i.e., under 1MB)
           localStorage.setItem(storageKey, JSON.stringify(currentState));
        }
      }
    }
  }, [csvData, columns, storageKey]);

  const instructionText = disableColumnEditing
    ? (disableDownload
        ? "View-only mode: Column reordering, renaming, cloning, deletion, and downloading are disabled."
        : "View-only mode: Column reordering, renaming, cloning, and deletion are disabled.")
    : "Drag headers to reorder. Tap a name to rename. Use icons to clone or delete columns.";


  return (
    <div className="bg-slate-900 text-slate-100 font-sans p-4 sm:p-8 flex flex-col rounded-xl border border-slate-700 shadow-lg">
      <header className="text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
          {title || `CSV Editor Instance ${instanceNumber}`}
        </h2>
        <p className="text-slate-400 mt-2">
          {description || "Upload, reorder, rename, and transform your CSV files."}
        </p>
      </header>
      <div className="max-w-7xl w-full mx-auto flex-grow flex flex-col">
        {!csvData ? (
          <FileUpload onFileLoad={handleFileLoad} error={error} maxFileSizeMB={MAX_FILE_SIZE_MB} />
        ) : (
          <div className="bg-slate-800 p-4 sm:p-8 rounded-xl border border-slate-700 shadow-lg flex-grow flex flex-col">
            <div className="flex flex-wrap gap-4 items-center mb-6">
                <h3 className="text-2xl font-bold text-slate-100 flex-grow">Data Preview</h3>
                <button
                  onClick={handleReset}
                  className="bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                 Load New File
                </button>
                {!disableDownload && (
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    <DownloadIcon /> Download CSV
                  </button>
                )}
                {!disableColumnEditing && (
                  <button
                    onClick={handleAddNewColumn}
                    className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    <AddIcon /> Add Column
                  </button>
                )}
                {!disableColumnEditing && (
                  <button
                    onClick={handleUndo}
                    disabled={history.length === 0}
                    className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UndoIcon /> Undo
                  </button>
                )}
            </div>
            <p className="text-slate-400 mb-6">
                {instructionText}
            </p>
            <DataTable 
              data={csvData} 
              columns={columns} 
              setColumns={handleSetColumns}
              onCloneColumn={handleCloneColumn}
              onDeleteColumn={handleDeleteColumn}
              disableColumnEditing={disableColumnEditing}
              referenceColumns={referenceColumns}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CsvEditor;