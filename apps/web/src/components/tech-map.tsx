"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export function TechMap() {
  return (
    <div className="relative w-full h-[600px] flex items-center justify-center overflow-hidden">
      {/* Soft Ethereal Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[200px]" />
      
      <div className="relative w-full max-w-[1200px] h-full flex items-center justify-center mt-12">
        {/* Subtle Visible No-Text Topo Asia Map Image with Breathing Animation */}
        <motion.div 
          className="absolute inset-0 z-0 scale-105"
          animate={{ opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/subtle_visible_topo_asia_map_no_text_1777392507701.png"
            alt="Geniein Strategic Asia Network"
            fill
            className="object-contain mix-blend-screen brightness-105 contrast-110"
            style={{
              maskImage: 'radial-gradient(circle at 60% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)',
              WebkitMaskImage: 'radial-gradient(circle at 60% 50%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 90%)'
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
