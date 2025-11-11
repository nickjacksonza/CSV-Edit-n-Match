import React from 'react';
import { Column } from '../types';

interface ColumnManagerProps {
  columns: Column[];
  onColumnChange: (id: string, newName: string) => void;
  onReset: () => void;
}

const ColumnManager: React.FC<ColumnManagerProps> = ({ columns, onColumnChange, onReset }) => {
  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-100">Manage Columns</h2>
        <button
          onClick={onReset}
          className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
        >
          Upload New File
        </button>
      </div>

      <p className="text-slate-400 mb-6">Rename columns to match your desired output. The table below will update in real-time.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {columns.map((column) => (
          <div key={column.id}>
            <label htmlFor={`col-${column.id}`} className="block text-sm font-medium text-slate-300 mb-1">
              {column.originalName}
            </label>
            <input
              type="text"
              id={`col-${column.id}`}
              value={column.newName}
              onChange={(e) => onColumnChange(column.id, e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnManager;
