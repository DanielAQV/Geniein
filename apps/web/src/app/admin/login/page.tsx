"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, User, ArrowRight, ShieldCheck } from "lucide-react"
import { motion } from "framer-motion"

/** `?from=` 은 사용자 입력이다. 같은 오리진의 admin 경로만 허용한다 (오픈 리다이렉트 방지) */
function safeRedirect(from: string | null): string {
  if (!from) return "/admin/insights"
  // `//evil.com` 은 브라우저가 프로토콜 상대 URL 로 읽는다 — 반드시 걸러야 한다
  if (!from.startsWith("/admin") || from.startsWith("//")) return "/admin/insights"
  return from
}

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // 자격증명 검증은 서버에서만 일어난다. 이 컴포넌트는 정답을 모른다.
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      if (res.ok) {
        // useSearchParams 를 쓰면 Suspense 경계가 필요해진다.
        // 제출 시점(클라이언트 확정)에만 읽으면 그 제약이 없다.
        const from = new URLSearchParams(window.location.search).get("from")
        // 쿠키가 세팅됐으므로 서버 상태를 다시 읽어야 한다
        router.replace(safeRedirect(from))
        router.refresh()
        return
      }

      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setError(`Too many attempts. Try again in ${data.retryAfterSeconds ?? 60}s.`)
      } else if (res.status === 503) {
        setError("Admin login is not configured on this server.")
      } else {
        setError("Invalid username or password")
      }
    } catch {
      setError("Could not reach the server. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#02040a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#050810]/80 backdrop-blur-2xl border border-white/5 p-10 rounded-[2.5rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tighter text-white mb-2">Admin Access</h1>
            <p className="text-muted-foreground font-light">Enter credentials to manage Geniein</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  required
                />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-500 text-sm font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20"
              >
                {error}
              </motion.p>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-muted-foreground text-sm">
          Protected by Geniein Security System
        </p>
      </motion.div>
    </div>
  )
}
