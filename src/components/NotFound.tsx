import React from 'react';
import {
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Loader2
} from 'lucide-react';

export default function NotFound({ onNavigateToApp }) {
  return (
    <div className="min-h-[100vh] min-h-[100dvh] bg-[#0B0E11] flex flex-col items-center justify-center px-4 pt-20 text-center">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-0">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#3DDC97]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#3DDC97]/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center space-y-6 max-w-2xl">
        {/* Glassmorphism panel */}
        <div className="glass-panel backdrop-blur-xl p-10 w-full max-w-md">
          {/* 404 Icon with animation */}
          <div className="w-24 h-24 mb-6 flex items-center justify-center">
            <AlertCircle
              className="w-full h-full text-[#E8544F] animate-pulse"
              size={48}
            />
          </div>

          {/* Main 404 Text */}
          <h1 className="font-display text-5xl font-bold text-white mb-4 tracking-tighter leading-none">
            404
          </h1>

          <p className="font-display text-2xl font-semibold text-[#3DDC97] mb-6">
            Page Not Found
          </p>

          {/* Illustration/Visual Metaphor */}
          <div className="w-32 h-32 mb-8 flex items-center justify-center">
            {/* Disconnected network node concept */}
            <div className="relative w-full h-full">
              {/* Main node (disconnected) */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#3DDC97]/30 bg-[#3DDC97]/5"></div>
              </div>
              {/* Floating disconnected elements */}
              <div className="absolute -top-4 left-0 w-4 h-4 bg-[#3DDC97]/20 rounded-full"></div>
              <div className="absolute top-0 right-0 w-4 h-4 bg-[#3DDC97]/20 rounded-full"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 bg-[#3DDC97]/20 rounded-full"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#3DDC97]/20 rounded-full"></div>
              {/* Connection attempts (failing) */}
              <div className="absolute left-1/2 top-1/2 -z-10 w-[1px] h-[80px] bg-[#3DDC97]/20"></div>
              <div className="absolute left-1/2 top-1/2 -z-10 w-[80px] h-[1px] bg-[#3DDC97]/20"></div>
              {/* Glowing particles around disconnected areas */}
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#3DDC97]/10 rounded-full blur-sm animate-pulse"></div>
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#3DDC97]/10 rounded-full blur-sm animate-pulse delay-200"></div>
              <div className="absolute bottom-2 left-2 w-6 h-6 bg-[#3DDC97]/10 rounded-full blur-sm animate-pulse delay-400"></div>
              <div className="absolute bottom-2 right-2 w-6 h-6 bg-[#3DDC97]/10 rounded-full blur-sm animate-pulse delay-600"></div>
            </div>
          </div>

          {/* Helpful Microcopy */}
          <p className="font-sans text-lg text-[#FFFFFF]/80 mb-8 max-w-xl leading-relaxed">
            It seems the page you're looking for has disconnected from the server.
            Let's get you back on track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            {/* Primary CTA: Return to Dashboard */}
            <button
              onClick={onNavigateToApp}
              className="btn-sweep flex-1 px-8 py-3 font-semibold font-display text-white transition-all hover-shadow-lg"
            >
              Return to Dashboard
            </button>

            {/* Secondary Link: Go to Homepage */}
            <a
              href="/"
              className="font-sans text-[#FFFFFF]/70 hover:text-white font-medium underline-hover transition-colors"
            >
              Go to Homepage
            </a>
          </div>

          {/* Optional: Refresh button for retrying */}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 flex items-center gap-2 text-[#FFFFFF]/60 hover:text-white text-sm font-sans"
          >
            <RefreshCw className="w-4 h-4 text-[#3DDC97]" />
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
}