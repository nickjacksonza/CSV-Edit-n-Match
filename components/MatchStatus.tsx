import React from 'react';
import { MagicIcon, LoadingSpinnerIcon } from './Icons';

interface MatchStatusProps {
    status: {
        message: string;
        color: string;
        progress: number;
    };
    hasReferenceData: boolean;
    hasUnmatchedColumns: boolean;
    isLoading: boolean;
    onFindMatches: () => void;
}

const MatchStatus: React.FC<MatchStatusProps> = ({ status, hasReferenceData, hasUnmatchedColumns, isLoading, onFindMatches }) => {
    
    const isButtonDisabled = !hasReferenceData || !hasUnmatchedColumns || isLoading;

    let buttonTitle = '';
    if (!hasReferenceData) {
        buttonTitle = 'Upload a reference CSV to enable AI matching.';
    } else if (!hasUnmatchedColumns) {
        buttonTitle = 'All columns are already matched by name.';
    }

    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg text-center">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                <h3 className="text-2xl font-bold text-slate-100">Match Status</h3>
                <button
                    onClick={onFindMatches}
                    disabled={isButtonDisabled}
                    title={buttonTitle}
                    className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                    {isLoading ? <LoadingSpinnerIcon /> : <MagicIcon />}
                    {isLoading ? 'Analyzing...' : 'Find Potential Matches'}
                </button>
            </div>
            
            <p className={`text-lg font-medium ${status.color} mb-4 transition-colors`}>{status.message}</p>
            {hasReferenceData && (
                <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-cyan-500 to-teal-400 h-4 rounded-full transition-all duration-500 ease-out" 
                      style={{ width: `${status.progress}%` }}
                    ></div>
                </div>
            )}
        </div>
    );
};

export default MatchStatus;
