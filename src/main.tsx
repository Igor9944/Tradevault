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
import './styles/theme.css';
import { ThemeLanguageProvider } from './utils/themeLanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';

const isVercel = typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app');

// Safe analytics loader — errors won't kill the app
function SafeAnalytics() {
  try {
    if (!isVercel) return null;
    const { Analytics } = require('@vercel/analytics/react');
    return <Analytics />;
  } catch { return null; }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeLanguageProvider>
        <App />
        <SafeAnalytics />
      </ThemeLanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
);

// Load analytics separately after app mounts — won't block or crash the app
if (isVercel) {
  setTimeout(() => {
    try {
      import('@vercel/analytics/react').then(({ Analytics }) => {
        // Analytics injected asynchronously — safe
        console.log('[TradeVault] Analytics loaded');
      }).catch(() => {});
    } catch {}
  }, 2000);
}