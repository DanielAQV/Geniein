"use client"

import { motion } from "framer-motion"

export function InteractiveGlobe() {
  return (
    <div className="relative w-full aspect-square max-w-[600px] mx-auto">
      {/* Background Glows */}
      <div className="absolute inset-0 bg-primary/5 rounded-full blur-[100px] animate-pulse" />
      
      {/* Main Globe Container */}
      <motion.div
        animate={{ rotateY: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        className="relative w-full h-full perspective-[1000px] preserve-3d"
      >
        <svg viewBox="0 0 400 400" className="w-full h-full opacity-40">
          <defs>
            <radialGradient id="globe-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.4" />
            </radialGradient>
          </defs>
          
          {/* Outer Ring */}
          <circle cx="200" cy="200" r="198" fill="none" stroke="var(--primary)" strokeWidth="0.5" strokeDasharray="5 5" className="opacity-20" />
          
          {/* Base Sphere */}
          <circle cx="200" cy="200" r="160" fill="url(#globe-grad)" stroke="var(--primary)" strokeWidth="0.5" className="opacity-30" />
          
          {/* Latitudes */}
          <ellipse cx="200" cy="200" rx="160" ry="60" fill="none" stroke="var(--primary)" strokeWidth="0.5" className="opacity-20" />
          <ellipse cx="200" cy="200" rx="160" ry="120" fill="none" stroke="var(--primary)" strokeWidth="0.5" className="opacity-20" />
          
          {/* Longitudes */}
          <ellipse cx="200" cy="200" rx="60" ry="160" fill="none" stroke="var(--primary)" strokeWidth="0.5" className="opacity-20" />
          <ellipse cx="200" cy="200" rx="120" ry="160" fill="none" stroke="var(--primary)" strokeWidth="0.5" className="opacity-20" />
          
          {/* Core Axis */}
          <line x1="200" y1="40" x2="200" y2="360" stroke="var(--primary)" strokeWidth="0.5" strokeDasharray="10 5" className="opacity-10" />
          <line x1="40" y1="200" x2="360" y2="200" stroke="var(--primary)" strokeWidth="0.5" strokeDasharray="10 5" className="opacity-10" />
        </svg>

        {/* Floating Nodes (Points of Interest) */}
        <Node top="20%" left="30%" delay={0} />
        <Node top="45%" left="75%" delay={1} />
        <Node top="65%" left="20%" delay={2} />
        <Node top="30%" left="60%" delay={1.5} />
      </motion.div>

      {/* Static Overlays for Depth */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full border border-primary/20 shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)]" />
      </div>
    </div>
  )
}

function Node({ top, left, delay }: { top: string; left: string; delay: number }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1, 0] }}
      transition={{ duration: 4, repeat: Infinity, delay }}
      style={{ top, left }}
      className="absolute w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]"
    />
  )
}
