"use client";

import React from "react";

interface CricketLoaderProps {
  label?: string;
  subtext?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function CricketLoader({
  label = "Processing Review Intelligence...",
  subtext,
  size = "md",
  className = "",
}: CricketLoaderProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const svgWidth = isSm ? 64 : isLg ? 160 : 110;
  const svgHeight = isSm ? 48 : isLg ? 110 : 80;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center select-none ${
        isSm ? "p-2" : isLg ? "p-12" : "p-6"
      } ${className}`}
    >
      {/* Animated Cricket Pitch / Bat & Ball Stage */}
      <div className="relative flex items-center justify-center">
        {/* Glow backdrop */}
        <div
          className={`absolute rounded-full bg-gradient-to-tr from-indigo-600/30 via-rose-500/20 to-amber-500/30 blur-2xl pointer-events-none ${
            isSm ? "w-16 h-16" : isLg ? "w-44 h-44" : "w-28 h-28"
          }`}
        />

        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox="0 0 160 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 overflow-visible"
        >
          <defs>
            {/* Willow Wood Gradient for Bat */}
            <linearGradient id="batWillow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>

            {/* Rubber Grip Gradient */}
            <linearGradient id="batGrip" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>

            {/* Red Cricket Ball Gradient */}
            <radialGradient id="cricketBallGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ff4d6d" />
              <stop offset="45%" stopColor="#e11d48" />
              <stop offset="85%" stopColor="#9f1239" />
              <stop offset="100%" stopColor="#4c0519" />
            </radialGradient>

            {/* Impact Flash Filter */}
            <filter id="glowEffect" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Stumps / Wickets in Background */}
          <g opacity="0.35">
            {/* 3 Stumps */}
            <rect x="122" y="32" width="3.5" height="42" rx="1.5" fill="#fcd34d" />
            <rect x="130" y="30" width="3.5" height="44" rx="1.5" fill="#fcd34d" />
            <rect x="138" y="32" width="3.5" height="42" rx="1.5" fill="#fcd34d" />
            {/* 2 Bails */}
            <rect x="120" y="29" width="11" height="2.5" rx="1" fill="#fef08a" />
            <rect x="129" y="28" width="12" height="2.5" rx="1" fill="#fef08a" />
          </g>

          {/* Pitch Ground Line */}
          <line
            x1="10"
            y1="82"
            x2="150"
            y2="82"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />

          {/* Impact Spark Effect */}
          <g className="cricket-impact-sparks">
            <circle cx="82" cy="56" r="14" fill="#fbbf24" opacity="0.4" filter="url(#glowEffect)" />
            <line x1="82" y1="56" x2="72" y2="44" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />
            <line x1="82" y1="56" x2="94" y2="42" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
            <line x1="82" y1="56" x2="84" y2="70" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="82" y1="56" x2="68" y2="62" stroke="#fcd34d" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* Animated Cricket Bat */}
          <g className="cricket-bat-container">
            {/* Bat Blade */}
            <path
              d="M 68 28 C 70 24, 76 24, 78 28 L 84 62 C 84 66, 78 68, 72 68 C 66 68, 62 66, 62 62 Z"
              fill="url(#batWillow)"
              stroke="#78350f"
              strokeWidth="1"
            />
            {/* Center Spine */}
            <line x1="73" y1="28" x2="73" y2="64" stroke="#d97706" strokeWidth="1.2" strokeOpacity="0.7" />

            {/* Bat Handle */}
            <rect x="71" y="8" width="4" height="20" rx="1.5" fill="url(#batGrip)" stroke="#312e81" strokeWidth="0.8" />
            {/* Handle Grip Ribs */}
            <line x1="71" y1="12" x2="75" y2="12" stroke="#818cf8" strokeWidth="0.8" />
            <line x1="71" y1="16" x2="75" y2="16" stroke="#818cf8" strokeWidth="0.8" />
            <line x1="71" y1="20" x2="75" y2="20" stroke="#818cf8" strokeWidth="0.8" />
            <line x1="71" y1="24" x2="75" y2="24" stroke="#818cf8" strokeWidth="0.8" />

            {/* Bat Brand Sticker */}
            <rect x="68" y="32" width="10" height="7" rx="1.5" fill="#4338ca" />
            <text x="73" y="37" fontSize="3.5" fontWeight="bold" fill="#ffffff" textAnchor="middle">HW</text>
          </g>

          {/* Animated Cricket Ball */}
          <g className="cricket-ball-container">
            {/* Ball Body */}
            <circle cx="28" cy="58" r="8.5" fill="url(#cricketBallGrad)" filter="url(#glowEffect)" />

            {/* Ball Shine Highlight */}
            <ellipse cx="25.5" cy="54.5" rx="3.2" ry="2" fill="#ffffff" opacity="0.6" />

            {/* White Seam Stitches */}
            <path
              d="M 21 54 C 25 51, 31 63, 35 60"
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeDasharray="1.2 1"
              fill="none"
              opacity="0.85"
            />
          </g>
        </svg>
      </div>

      {/* Label and Subtext */}
      {!isSm && (
        <div className="mt-3.5 space-y-1">
          <div className="text-xs sm:text-sm font-semibold text-slate-200 tracking-wide flex items-center justify-center gap-2">
            <span>{label}</span>
            <span className="inline-flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          </div>
          {subtext && <p className="text-[0.72rem] text-slate-400">{subtext}</p>}
        </div>
      )}
    </div>
  );
}
