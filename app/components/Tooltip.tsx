"use client";

import { useState } from "react";
import { Info } from "lucide-react";

export default function InfoTooltip({
  content,
  size = 13,
  position = "top",
}: {
  content: string;
  size?: number;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-2.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-2.5",
  };

  return (
    <span
      className="relative inline-flex items-center group cursor-help ml-1 align-middle z-30"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="p-0.5 rounded-full text-slate-400 group-hover:text-indigo-300 group-hover:bg-indigo-500/15 transition-colors inline-flex items-center">
        <Info size={size} />
      </span>

      {isOpen && (
        <span
          className={`absolute ${positionClasses[position]} z-[100] w-60 p-3 rounded-xl bg-[#0e1322] border border-white/20 text-[0.72rem] leading-relaxed text-slate-200 shadow-[0_10px_30px_rgba(0,0,0,0.8)] pointer-events-none animate-in fade-in zoom-in-95 duration-150 block text-left font-normal`}
        >
          {content}
          {/* Arrow */}
          {position === "top" && (
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#0e1322] block" />
          )}
          {position === "bottom" && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 -mb-1 border-4 border-transparent border-b-[#0e1322] block" />
          )}
        </span>
      )}
    </span>
  );
}
