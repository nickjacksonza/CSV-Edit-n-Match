import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CsvData, Column } from '../types';
import { DragHandleIcon, CloseIcon, CloneIcon, TrashIcon } from './Icons';

interface DataTableProps {
  data: CsvData;
  columns: Column[];
  setColumns: React.Dispatch<React.SetStateAction<Column[]>>;
  onCloneColumn: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  disableColumnEditing: boolean;
  referenceColumns?: Column[] | null;
}

const DataTable: React.FC<DataTableProps> = ({ data, columns, setColumns, onCloneColumn, onDeleteColumn, disableColumnEditing, referenceColumns }) => {
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [resizingColId, setResizingColId] = useState<string | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; column: Column | null }>({ isOpen: false, column: null });
  const [tempName, setTempName] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  const isDraggableTarget = (target: EventTarget): boolean => {
    const el = target as HTMLElement;
    return !el.closest('button') && !el.classList.contains('cursor-col-resize') && !el.closest('.cursor-pointer');
  }

  const handleDragStart = (e: React.DragEvent<HTMLTableCellElement>, id: string) => {
    if (disableColumnEditing) {
      e.preventDefault();
      return;
    }
    if (!isDraggableTarget(e.target)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggedColId(id);
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableCellElement>) => {
    if (disableColumnEditing) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLTableCellElement>, targetColId: string) => {
    if (disableColumnEditing) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    if (!draggedColId || draggedColId === targetColId) return;

    setColumns(prevCols => {
      const draggedIndex = prevCols.findIndex(c => c.id === draggedColId);
      const targetIndex = prevCols.findIndex(c => c.id === targetColId);
      const newCols = [...prevCols];
      const [draggedItem] = newCols.splice(draggedIndex, 1);
      newCols.splice(targetIndex, 0, draggedItem);
      return newCols;
    });
    setDraggedColId(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLTableCellElement>, id: string) => {
    if (disableColumnEditing) {
        return;
    }
    if (!isDraggableTarget(e.target)) {
        return;
    }
    setDraggedColId(id);
    const th = (e.target as HTMLElement).closest('th');
    if (th) {
        th.style.opacity = '0.5';
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLTableCellElement>) => {
    if (disableColumnEditing) {
        return;
    }
    if (!draggedColId || !tableRef.current) return;
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetTh = target?.closest('th');
    
    if (targetTh && targetTh.dataset.colId && targetTh.dataset.colId !== draggedColId) {
        const targetColId = targetTh.dataset.colId;
        setColumns(prevCols => {
            const draggedIndex = prevCols.findIndex(c => c.id === draggedColId);
            const targetIndex = prevCols.findIndex(c => c.id === targetColId);
            if (draggedIndex === -1 || targetIndex === -1) return prevCols;

            const newCols = [...prevCols];
            const [draggedItem] = newCols.splice(draggedIndex, 1);
            newCols.splice(targetIndex, 0, draggedItem);
            return newCols;
        });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLTableCellElement>) => {
    if (disableColumnEditing) {
        return;
    }
    const th = (e.target as HTMLElement).closest('th');
    if (th) {
        th.style.opacity = '1';
    }
    setDraggedColId(null);
  };

  const startResizing = useCallback((e: React.MouseEvent, id: string) => {
    if (disableColumnEditing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    setResizingColId(id);
    setStartX(e.clientX);
    const col = columns.find(c => c.id === id);
    setStartWidth(col?.width || 150);
  }, [columns, disableColumnEditing]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (disableColumnEditing) return;
    if (!resizingColId) return;
    const width = startWidth + (e.clientX - startX);
    if (width > 50) {
      setColumns(prev => prev.map(c => c.id === resizingColId ? { ...c, width } : c));
    }
  }, [resizingColId, startX, startWidth, setColumns, disableColumnEditing]);

  const stopResizing = useCallback(() => {
    if (disableColumnEditing) return;
    setResizingColId(null);
  }, [disableColumnEditing]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  const openRenameModal = (column: Column) => {
    if (disableColumnEditing) return;
    setRenameModal({ isOpen: true, column });
    setTempName(column.newName);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disableColumnEditing) return;
    if (renameModal.column) {
      setColumns(prev => prev.map(c => c.id === renameModal.column!.id ? { ...c, newName: tempName } : c));
    }
    setRenameModal({ isOpen: false, column: null });
  };

  if (!data) {
    return <p className="text-slate-400 text-center p-8">No data to display.</p>;
  }

  return (
    <>
      <div className="overflow-auto relative flex-grow">
        <table ref={tableRef} className="w-full text-sm text-left text-slate-400 border-separate border-spacing-0">
          <thead className="text-xs text-slate-100 uppercase bg-slate-700 sticky top-0 z-10">
            <tr>
              {columns.map((col, index) => {
                const isNameMatch = referenceColumns?.some(refCol => refCol.newName === col.newName) ?? false;
                const isPositionMatch = referenceColumns?.[index]?.newName === col.newName;

                let headerBorderClass = 'border-slate-600';
                let headerTitle = '';

                if (referenceColumns) {
                    if (isPositionMatch) {
                        headerBorderClass = 'border-green-500';
                        headerTitle = `Perfect Match: Column "${col.newName}" is in the correct position.`;
                    } else if (isNameMatch) {
                        headerBorderClass = 'border-yellow-500';
                        headerTitle = `Name Match: Column "${col.newName}" exists in the reference, but is in the wrong position.`;
                    } else {
                        headerTitle = `No Match: Column "${col.newName}" does not exist in the reference.`;
                    }
                }

                return (
                  <th
                    key={col.id}
                    data-col-id={col.id}
                    scope="col"
                    className={`p-0 border-b-2 ${headerBorderClass} relative select-none transition-colors ${!disableColumnEditing ? 'cursor-grab active:cursor-grabbing touch-none' : ''}`}
                    style={{ width: col.width }}
                    title={headerTitle}
                    draggable={!disableColumnEditing}
                    onDragStart={!disableColumnEditing ? (e) => handleDragStart(e, col.id) : undefined}
                    onDragOver={!disableColumnEditing ? handleDragOver : undefined}
                    onDrop={!disableColumnEditing ? (e) => handleDrop(e, col.id) : undefined}
                    onTouchStart={!disableColumnEditing ? (e) => handleTouchStart(e, col.id) : undefined}
                    onTouchMove={!disableColumnEditing ? handleTouchMove : undefined}
                    onTouchEnd={!disableColumnEditing ? handleTouchEnd : undefined}
                  >
                    <div className="flex flex-col h-full">
                      {!disableColumnEditing && (
                          <div className="flex items-center justify-center gap-x-2 py-1 px-2 border-b border-slate-600">
                              <div className="p-1" title="Drag to reorder">
                                  <DragHandleIcon />
                              </div>
                              <button onClick={() => onCloneColumn(col.id)} title="Clone Column" className="p-1 rounded-full hover:bg-slate-500 transition-colors"><CloneIcon /></button>
                              <button onClick={() => onDeleteColumn(col.id)} title="Delete Column" className="p-1 rounded-full hover:bg-slate-500 transition-colors"><TrashIcon /></button>
                          </div>
                      )}
                      <div 
                        className="flex items-center justify-center p-2 flex-grow"
                      >
                        <div 
                          title={col.newName}
                          onClick={!disableColumnEditing ? () => openRenameModal(col) : undefined}
                          className={`truncate ${!disableColumnEditing ? 'cursor-pointer hover:text-cyan-400' : ''}`}
                        >
                          {col.newName}
                        </div>
                      </div>
                    </div>
                    {!disableColumnEditing && (
                      <div 
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        onMouseDown={(e) => startResizing(e, col.id)}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-slate-800">
            {data.rows.slice(0, 10).map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-slate-600/50">
                {columns.map((col) => (
                  <td key={`${col.id}-${rowIndex}`} className="py-3 px-3 border-b border-slate-700 truncate" style={{maxWidth: col.width}}>
                    {col.originalIndex > -1 ? row[col.originalIndex] : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length > 10 && (
            <p className="text-center text-slate-500 py-4 sticky bottom-0 bg-slate-800">... and {data.rows.length - 10} more rows.</p>
        )}
      </div>

      {renameModal.isOpen && renameModal.column && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setRenameModal({isOpen: false, column: null})}>
            <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Rename Column</h3>
                    <button onClick={() => setRenameModal({isOpen: false, column: null})} className="text-slate-400 hover:text-white"><CloseIcon /></button>
                </div>
                <p className="text-slate-400 mb-2">Original name: <span className="font-mono bg-slate-700 px-2 py-1 rounded">{renameModal.column.originalName}</span></p>
                <form onSubmit={handleRenameSubmit}>
                    <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-slate-700 border border-slate-600 text-white text-lg rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 mt-4"
                        autoFocus
                    />
                    <button type="submit" className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-4 rounded-lg transition-colors">Save Name</button>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default DataTable;