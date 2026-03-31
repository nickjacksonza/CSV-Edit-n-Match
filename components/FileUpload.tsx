import React, { useState, useCallback } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileLoad: (file: File) => void;
  error: string;
  maxFileSizeMB: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileLoad, error, maxFileSizeMB }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileLoad(e.target.files[0]);
    }
  };
  
  const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvent(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileLoad(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileLoad]);

  return (
    <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-lg">
        <h2 className="text-2xl font-bold text-center text-slate-100 mb-2">Upload your CSV file</h2>
        <p className="text-slate-400 text-center mb-6">Drag & drop a file or click to select one.</p>
      <div
        onDragEnter={(e) => handleDragEvent(e, true)}
        onDragLeave={(e) => handleDragEvent(e, false)}
        onDragOver={(e) => handleDragEvent(e, true)}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center w-full p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300 ${isDragging ? 'border-cyan-400 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'}`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
          <UploadIcon />
          <p className="mb-2 text-sm"><span className="font-semibold text-cyan-400">Click to upload</span> or drag and drop</p>
          <p className="text-xs">CSV files up to {maxFileSizeMB}MB</p>
        </div>
        <input 
          id="dropzone-file" 
          type="file" 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          accept=".csv,text/csv,application/vnd.ms-excel"
          onChange={handleFileChange}
        />
      </div>
      {error && <p className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg">{error}</p>}
    </div>
  );
};

export default FileUpload;