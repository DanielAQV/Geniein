"use client"

import { ReactNode } from "react"
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  Search, 
  Bell,
  LogOut,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

interface AdminLayoutProps {
  children: ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()

  // 인증 검사는 여기 없다. middleware.ts 가 이 컴포넌트에 닿기 전에 막는다 —
  // 여기서 한 번 더 검사하면 약한 쪽이 우회 경로가 된다.

  const handleLogout = async () => {
    // httpOnly 쿠키라 클라이언트가 지울 수 없다 — 서버에 요청한다
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {})
    router.replace("/admin/login")
    router.refresh()
  }

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin" },
    { name: "AI Insights", icon: FileText, href: "/admin/insights" },
    { name: "AI Settings", icon: Sparkles, href: "/admin/settings" },
    { name: "General Settings", icon: Settings, href: "/admin/general" },
  ]

  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#02040a] text-foreground flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#050810] flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <span className="font-bold text-xl tracking-tighter uppercase">Geniein <span className="text-primary">Admin</span></span>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]" 
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all w-full text-left"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-[#02040a]/80 backdrop-blur-xl flex items-center justify-between px-8 z-20 sticky top-0">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="h-10 w-10 rounded-full hover:bg-white/5 flex items-center justify-center relative transition-colors text-muted-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-[#02040a]" />
            </button>
            <div className="h-8 w-[1px] bg-white/5 mx-2" />
            <button className="flex items-center gap-3 hover:bg-white/5 px-3 py-1.5 rounded-full transition-colors">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white uppercase">
                AD
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium">Admin User</p>
                <p className="text-[10px] text-muted-foreground">Super Admin</p>
              </div>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(ellipse_at_top_right,rgba(var(--primary-rgb),0.05),transparent_50%)]">
          {children}
        </div>
      </main>
    </div>
  )
}
