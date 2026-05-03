"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import useSWR from "swr"
import { fetcher } from "@/lib/api"
import { useLanguage } from "@/lib/i18n/language-context"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { 
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Tag,
  Sparkles
} from "lucide-react"
import { motion } from "framer-motion"

export default function InsightDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { language } = useLanguage()
  const { data: insight, error, isLoading } = useSWR(`/insights/${id}`, fetcher)

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )

  if (error || !insight) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Insight not found</h1>
      <button onClick={() => router.back()} className="text-primary flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" /> Go back
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
          >
            <div className="h-8 w-8 rounded-full border border-border/50 flex items-center justify-center group-hover:border-primary/50 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium">Back to Insights</span>
          </button>

          {/* Article Header */}
          <header className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                {insight.category}
              </span>
              <div className="h-1 w-1 rounded-full bg-foreground/20" />
              <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                {(() => { const d = new Date(insight.published_at || insight.created_at); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; })()}
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8 leading-[1.1]">
              {insight[`title_${language}`] || insight.title_kr}
            </h1>

            {/* Featured Image (NEW) */}
            <div className="relative w-full h-[400px] md:h-[500px] rounded-[2.5rem] overflow-hidden mb-12 border border-border/30 shadow-2xl">
              {insight.thumbnail_url ? (
                <img 
                  src={insight.thumbnail_url} 
                  alt={insight[`title_${language}`] || insight.title_kr}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <Sparkles className="h-20 w-20 text-primary/30 animate-pulse" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            </div>

            <div className="flex items-center justify-between py-6 border-y border-border/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center font-bold text-white shadow-lg">
                  G
                </div>
                <div>
                  <p className="text-sm font-semibold">Geniein AI Strategy Team</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-tighter">Automated Insight Report</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="space-y-12">
            {/* Deep Dive Summary Block */}
            <section className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/50 rounded-full" />
              <div className="pl-6 space-y-6">
                <p className="text-lg md:text-xl text-muted-foreground font-light leading-relaxed whitespace-pre-line">
                  {insight[`summary_${language}`] || insight.summary_kr}
                </p>
                
                {insight.source_document_id && (
                  <a 
                    href={insight.source_document_id}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary/60 hover:text-primary transition-colors group/source pt-2"
                  >
                    <span>View Original Source</span>
                    <ArrowUpRight className="h-4 w-4 group-hover/source:translate-x-0.5 group-hover/source:-translate-y-0.5 transition-transform" />
                  </a>
                )}
              </div>
            </section>

            {/* Geniein Perspective Highlight - Commented out as requested
            {(insight[`perspective_${language}`] || insight.perspective_kr) && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-primary/5 border border-primary/10 rounded-3xl p-8 md:p-10 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-8 text-primary/10 opacity-20 group-hover:scale-110 transition-transform duration-500">
                  <Sparkles className="h-24 w-24" />
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-xl font-bold uppercase tracking-widest text-primary">Geniein's Perspective</h2>
                </div>

                <div className="relative z-10">
                  <p className="text-lg md:text-xl text-foreground leading-relaxed font-medium">
                    {insight[`perspective_${language}`] || insight.perspective_kr}
                  </p>
                </div>
              </motion.section>
            )}
            */}

            {/* Tags */}
            {insight.tags && insight.tags.length > 0 && (
              <div className="pt-8 flex flex-wrap gap-2">
                {insight.tags.map((tag: string) => (
                  <Link 
                    key={tag} 
                    href={`/insights?tag=${encodeURIComponent(tag)}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-muted-foreground hover:bg-primary/20 hover:border-primary/30 hover:text-primary transition-all group/tag"
                  >
                    <Tag className="h-3 w-3 group-hover/tag:scale-110 transition-transform" /> {tag}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
