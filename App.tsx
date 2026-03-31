import React, { useState, useMemo } from 'react';
import CsvEditor from './CsvEditor';
import { Column, CsvData, PotentialMatch } from './types';
import MatchStatus from './components/MatchStatus';
import SuggestionsModal from './components/SuggestionsModal';
import { GoogleGenAI, Type } from "@google/genai";

const App: React.FC = () => {
  const [referenceColumns, setReferenceColumns] = useState<Column[] | null>(null);
  const [activeColumns, setActiveColumns] = useState<Column[]>([]);
  const [activeCsvData, setActiveCsvData] = useState<CsvData | null>(null);

  const [isFindingMatches, setIsFindingMatches] = useState(false);
  const [suggestions, setSuggestions] = useState<PotentialMatch[]>([]);
  const [isSuggestionsModalOpen, setIsSuggestionsModalOpen] = useState(false);
  const [apiError, setApiError] = useState('');

  const { matchedColumnNames, perfectlyMatchedColumnNames } = useMemo(() => {
    if (!referenceColumns) {
      return { matchedColumnNames: new Set(), perfectlyMatchedColumnNames: new Set() };
    }
    const refNames = new Set(referenceColumns.map(c => c.newName));
    const matched = new Set(activeColumns.filter(c => refNames.has(c.newName)).map(c => c.newName));
    
    const perfect = new Set();
    const len = Math.min(activeColumns.length, referenceColumns.length);
    for (let i = 0; i < len; i++) {
        if (activeColumns[i].newName === referenceColumns[i].newName) {
            perfect.add(activeColumns[i].newName);
        }
    }
    return { matchedColumnNames: matched, perfectlyMatchedColumnNames: perfect };
  }, [activeColumns, referenceColumns]);


  const matchStatus = useMemo(() => {
    if (!referenceColumns || referenceColumns.length === 0) {
      return {
        message: 'Upload a reference CSV to begin matching.',
        color: 'text-slate-400',
        progress: 0,
      };
    }
    
    let positionMatches = 0;
    const len = Math.min(activeColumns.length, referenceColumns.length);
    for (let i = 0; i < len; i++) {
        if (activeColumns[i].newName === referenceColumns[i].newName) {
            positionMatches++;
        }
    }
    
    const isPerfectMatch = activeColumns.length === referenceColumns.length && positionMatches === activeColumns.length;

    if (isPerfectMatch) {
      return {
        message: 'Perfect Match! Column names and order align with the reference.',
        color: 'text-green-400',
        progress: 100,
      };
    }
    
    const progress = (matchedColumnNames.size / referenceColumns.length) * 100;

    return {
        message: `${matchedColumnNames.size} of ${referenceColumns.length} reference columns matched by name. ${positionMatches} are in the correct position.`,
        color: 'text-yellow-400',
        progress,
    };

  }, [activeColumns, referenceColumns, matchedColumnNames]);

  const handleFindPotentialMatches = async () => {
    if (!activeCsvData || !referenceColumns) return;
    
    setIsFindingMatches(true);
    setApiError('');

    const activeUnmatched = activeColumns.filter(c => !matchedColumnNames.has(c.newName));
    const refUnmatchedNames = referenceColumns.filter(c => !matchedColumnNames.has(c.newName)).map(c => c.newName);

    if (activeUnmatched.length === 0 || refUnmatchedNames.length === 0) {
        setIsFindingMatches(false);
        // This case should be handled by disabling the button, but as a fallback:
        setApiError("No unmatched columns available to analyze.");
        // We'll show this in the modal for clarity.
        setIsSuggestionsModalOpen(true); 
        return;
    }

    const sourceDataForPrompt = activeUnmatched.map(col => {
      const data = activeCsvData.rows.slice(0, 5).map(row => col.originalIndex > -1 ? (row[col.originalIndex] || '') : '');
      return { name: col.newName, data };
    });

    const prompt = `You are an expert data analyst. Your task is to find potential column matches between two datasets based on their data content, not just their names.

    Here are the columns from the source dataset that need a match, along with the first 5 rows of their data:
    ${JSON.stringify(sourceDataForPrompt, null, 2)}
    
    Here is a list of available column names from the reference dataset that also need a match:
    ${JSON.stringify(refUnmatchedNames, null, 2)}
    
    Analyze the data patterns, types, and content. Return a JSON array of potential matches. Each object in the array should have three keys: 'sourceColumn' (the name from the source dataset), 'referenceColumn' (the best matching name from the reference dataset), and 'reason' (a brief explanation of why you think they match). Only include matches you are reasonably confident about. If you find no confident matches, return an empty array.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceColumn: { type: Type.STRING },
                referenceColumn: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ['sourceColumn', 'referenceColumn', 'reason']
            }
          }
        }
      });
      
      const suggestions = JSON.parse(response.text);
      setSuggestions(suggestions);

    } catch (e) {
        console.error("Gemini API Error:", e);
        setApiError("Failed to get suggestions from the AI. Please try again.");
    } finally {
        setIsFindingMatches(false);
        setIsSuggestionsModalOpen(true);
    }
  };
  
  const handleAcceptSuggestion = (sourceName: string, newName: string) => {
    setActiveColumns(prev => {
        const newCols = prev.map(c => c.newName === sourceName ? {...c, newName} : c);
        // Remove the accepted suggestion from the list
        setSuggestions(sugs => sugs.filter(s => s.sourceColumn !== sourceName));
        return newCols;
    });
  };

  return (
    <>
      <div className="bg-slate-900 min-h-screen text-slate-100 font-sans p-4 sm:p-8 flex flex-col">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-teal-500">
            CSV Column Transformer
          </h1>
          <p className="text-slate-400 mt-2">Reorder, rename, and match your CSV columns to a reference file.</p>
        </header>
        <main className="max-w-7xl w-full mx-auto flex-grow flex flex-col gap-12">
          <CsvEditor
            storageKey="csvEditorSession1"
            instanceNumber={1}
            columns={activeColumns}
            onColumnsChange={setActiveColumns}
            onDataChange={setActiveCsvData}
            referenceColumns={referenceColumns}
          />

          <MatchStatus 
            status={matchStatus}
            hasReferenceData={!!referenceColumns && referenceColumns.length > 0}
            hasUnmatchedColumns={activeColumns.length > matchedColumnNames.size || referenceColumns?.length > matchedColumnNames.size}
            isLoading={isFindingMatches}
            onFindMatches={handleFindPotentialMatches}
          />

          <CsvEditor
            storageKey="csvEditorSession2"
            instanceNumber={2}
            disableColumnEditing={true}
            disableDownload={true}
            title="Reference CSV Matching"
            description="Upload a CSV here. Its column structure will be used as a reference for the editor above."
            onColumnsChange={setReferenceColumns}
          />
        </main>
        <footer className="text-center mt-12 text-slate-500">
          <p>Built with React, TypeScript &amp; Gemini.</p>
        </footer>
      </div>
      <SuggestionsModal 
        isOpen={isSuggestionsModalOpen}
        suggestions={suggestions}
        error={apiError}
        onAccept={handleAcceptSuggestion}
        onClose={() => {
            setIsSuggestionsModalOpen(false);
            setSuggestions([]);
            setApiError('');
        }}
      />
    </>
  );
};

export default App;