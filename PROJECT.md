# CSV Edit & Match

**Stack:** React 18, TypeScript, Vite, Gemini API  
**Live:** https://projects.slash301.com/CSVReorder/  
**Local:** `npm run dev` → http://localhost:5173  
**Env:** `GEMINI_API_KEY` in `.env.local`

## What it is
Browser-only tool for reordering columns in CSV files and matching them to a reference CSV. AI-assisted column matching via Gemini. No backend — all runs in-browser, no data leaves the client.

## Structure
- `App.tsx` — main app shell
- `CsvEditor.tsx` — core editor component
- `components/` — 6 tsx files supporting the editor
- `types.ts` — shared CSV types

## State
Functional vibe-coded utility. Small surface area. Gemini used for smart column matching suggestions. No persistence needed — load file, reorder, export.

## What needs work / next directions
- Error handling for malformed CSVs
- Large file performance (browser memory limits)
- Drag-to-reorder columns UX
- Could add row filtering/sorting
