// Crash-safety wrappers for performance timing APIs (prevents DataCloneError inside iframe environments)
if (typeof window !== 'undefined' && window.performance) {
  const perf = window.performance;
  
  if (typeof perf.mark === 'function') {
    const originalMark = perf.mark;
    perf.mark = function (...args: any[]) {
      try {
        return originalMark.apply(perf, args as any);
      } catch (err) {
        console.warn("[Performance Safety] Caught performance.mark failure:", err);
        return {
          entryType: 'mark',
          name: args[0],
          startTime: perf.now(),
          duration: 0,
          toJSON: () => ({})
        } as any;
      }
    };
  }

  if (typeof perf.measure === 'function') {
    const originalMeasure = perf.measure;
    perf.measure = function (...args: any[]) {
      try {
        return originalMeasure.apply(perf, args as any);
      } catch (err) {
        console.warn("[Performance Safety] Caught performance.measure failure:", err);
        return {
          entryType: 'measure',
          name: args[0],
          startTime: perf.now(),
          duration: 0,
          toJSON: () => ({})
        } as any;
      }
    };
  }

  if (typeof perf.clearMarks === 'function') {
    const originalClearMarks = perf.clearMarks;
    perf.clearMarks = function (name?: string) {
      try {
        originalClearMarks.call(perf, name);
      } catch (err) {
        console.warn("[Performance Safety] Caught performance.clearMarks failure:", err);
      }
    };
  }

  if (typeof perf.clearMeasures === 'function') {
    const originalClearMeasures = perf.clearMeasures;
    perf.clearMeasures = function (name?: string) {
      try {
        originalClearMeasures.call(perf, name);
      } catch (err) {
        console.warn("[Performance Safety] Caught performance.clearMeasures failure:", err);
      }
    };
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeLanguageProvider } from './utils/themeLanguageContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeLanguageProvider>
      <App />
    </ThemeLanguageProvider>
  </StrictMode>,
);
