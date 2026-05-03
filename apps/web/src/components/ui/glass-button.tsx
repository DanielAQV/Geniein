"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

interface GlassButtonProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function GlassButton({ href, children, className }: GlassButtonProps) {
  return (
    <Link href={href} className="w-full sm:w-auto">
      <motion.div
        whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(var(--primary-rgb) / 0.05)" }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className={cn(
          "flex items-center justify-center h-14 px-10 rounded-full",
          "bg-[var(--glass-bg)] backdrop-blur-md border border-[var(--glass-border)]",
          "hover:border-primary/30 transition-colors",
          "text-foreground font-bold text-base",
          className
        )}
      >
        {children}
      </motion.div>
    </Link>
  )
}
