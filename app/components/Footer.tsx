import React from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-indigo-900 bg-indigo-950 text-indigo-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-indigo-200">
          {/* Left: Branding & Assignment Note */}
          <div className="flex items-center gap-2">
            <span className="text-base">🏏</span>
            <span className="font-bold text-white">Hitwicket Review Intelligence</span>
            <span className="text-indigo-700 hidden sm:inline">•</span>
            <span className="text-indigo-200">
              Developed by{" "}
              <a
                href="https://github.com/namaninnovates/hitwicket_pipeline"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-300 hover:text-white underline underline-offset-4 decoration-indigo-400 hover:decoration-white transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                <span>namaninnovates</span>
                <ExternalLink size={11} className="inline opacity-80" />
              </a>{" "}
              as a part of assignment
            </span>
          </div>

          {/* Right: Clean Copyright */}
          <div className="text-[0.7rem] text-indigo-300 font-medium">
            Founder’s Office Market Intelligence
          </div>
        </div>

        {/* Disclaimer Line */}
        <div className="pt-2 border-t border-indigo-900 flex items-center justify-center sm:justify-start gap-1.5 text-[0.7rem] text-indigo-300/80">
          <ShieldAlert size={12} className="text-amber-400 shrink-0" />
          <span>Notice: Only for experimental &amp; evaluation purposes. Not affiliated with, endorsed by, or associated with Hitwicket.</span>
        </div>
      </div>
    </footer>
  );
}
