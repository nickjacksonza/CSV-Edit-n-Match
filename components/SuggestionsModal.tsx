import React from 'react';
import { PotentialMatch } from '../types';
import { CloseIcon, LoadingSpinnerIcon, MagicIcon } from './Icons';

interface SuggestionsModalProps {
  isOpen: boolean;
  suggestions: PotentialMatch[];
  error: string;
  onAccept: (sourceName: string, newName: string) => void;
  onClose: () => void;
}

const SuggestionsModal: React.FC<SuggestionsModalProps> = ({ isOpen, suggestions, error, onAccept, onClose }) => {
  if (!isOpen) return null;

  const hasSuggestions = suggestions && suggestions.length > 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-teal-500/20 p-2 rounded-lg">
                <MagicIcon />
            </div>
            <h3 className="text-2xl font-bold text-slate-100">AI Matching Suggestions</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><CloseIcon /></button>
        </div>
        
        <div className="overflow-y-auto pr-2 -mr-2">
            {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center">
                    <p className="font-bold mb-1">An Error Occurred</p>
                    <p>{error}</p>
                </div>
            )}

            {!error && !hasSuggestions && (
                 <div className="text-center text-slate-400 py-12">
                    <p className="text-lg">No confident matches found.</p>
                    <p className="text-sm">The AI couldn't find any strong correlations in the data samples.</p>
                </div>
            )}

            {hasSuggestions && (
                <div className="space-y-4">
                    {suggestions.map((suggestion) => (
                    <div key={suggestion.sourceColumn} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex-grow">
                            <p className="text-slate-200">
                                Map <span className="font-bold text-cyan-400 bg-slate-800 px-2 py-1 rounded">{suggestion.sourceColumn}</span> to <span className="font-bold text-teal-400 bg-slate-800 px-2 py-1 rounded">{suggestion.referenceColumn}</span>
                            </p>
                            <p className="text-xs text-slate-400 mt-2 italic">
                                Reason: {suggestion.reason}
                            </p>
                        </div>
                        <button 
                            onClick={() => onAccept(suggestion.sourceColumn, suggestion.referenceColumn)}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto flex-shrink-0"
                        >
                            Accept
                        </button>
                    </div>
                    ))}
                </div>
            )}
        </div>

        <div className="mt-6 text-right flex-shrink-0">
            <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                Done
            </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestionsModal;
