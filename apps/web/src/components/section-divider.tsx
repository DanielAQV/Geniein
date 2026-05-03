"use client"

import { motion } from "framer-motion"

export function SectionDivider() {
  return (
    <div className="relative w-full h-px overflow-hidden bg-transparent">
      <motion.div 
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/50 to-transparent shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" 
      />
    </div>
  )
}
