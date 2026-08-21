import React from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          {/* Left: Branding & Assignment Note */}
          <div className="flex items-center gap-2">
            <span className="text-base">🏏</span>
            <span className="font-bold text-slate-900">Hitwicket Review Intelligence</span>
            <span className="text-slate-300 hidden sm:inline">•</span>
            <span className="text-slate-600">
              Developed by{" "}
              <a
                href="https://github.com/namaninnovates/hitwicket_pipeline"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-4 decoration-indigo-300 hover:decoration-indigo-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>namaninnovates</span>
                <ExternalLink size={11} className="inline opacity-70" />
              </a>{" "}
              as a part of assignment
            </span>
          </div>

          {/* Right: Clean Copyright */}
          <div className="text-[0.7rem] text-slate-500 font-medium">
            Founder’s Office Market Intelligence
          </div>
        </div>

        {/* Disclaimer Line */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-center sm:justify-start gap-1.5 text-[0.7rem] text-slate-500">
          <ShieldAlert size={12} className="text-amber-600 shrink-0" />
          <span>Notice: Only for experimental &amp; evaluation purposes. Not affiliated with, endorsed by, or associated with Hitwicket.</span>
        </div>
      </div>
    </footer>
  );
}
