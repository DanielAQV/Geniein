"use client"
import React, { useState } from "react"

import { ArrowUpRight, Rss, Clock, Sparkles, ArrowRight, Tag, Globe, Cpu, Zap } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

import { useSearchParams } from "next/navigation"
import { GlassButton } from "./ui/glass-button"
import useSWR from "swr"
import { fetcher } from "@/lib/api"

interface AIInsightsProps {
  isFullPage?: boolean
  category?: string
  id?: string
}

export function AIInsights({ isFullPage = false, category, id = "insights" }: AIInsightsProps) {
  const { t, language } = useLanguage()
  const searchParams = useSearchParams()
  const activeTag = searchParams.get('tag')
  const [page, setPage] = useState(1)
  const limit = isFullPage ? 6 : 3
  
  // Update API URL based on category and tag
  let apiUrl = `/insights?limit=${limit}&page=${page}`
  if (category) apiUrl += `&category=${category}`
  if (activeTag) apiUrl += `&tag=${encodeURIComponent(activeTag)}`
    
  const { data: insights, isLoading } = useSWR(apiUrl, fetcher)
  
  // Use API data if available, otherwise return empty array (remove static demo fallback)
  const insightItems = insights && insights.length > 0 
    ? insights.map((item: any) => ({
        id: item.id,
        title: { 
          kr: item.title_kr || "인사이트 제목 준비 중", 
          en: item.title_en || "Insight title coming soon", 
          vn: item.title_vn || "Tiêu đề nội dung sắp ra mắt" 
        },
        summary: { 
          kr: item.summary_kr || "내용을 분석하고 있습니다.", 
          en: item.summary_en || "Analyzing content...", 
          vn: item.summary_vn || "Đang phân tích nội dung..." 
        },
        perspective: { kr: item.perspective_kr, en: item.perspective_en, vn: item.perspective_vn },
        thumbnail_url: item.thumbnail_url,
        category: item.category,
        date: { 
          kr: item.published_at ? (() => { const d = new Date(item.published_at); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; })() : "최근", 
          en: item.published_at ? (() => { const d = new Date(item.published_at); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; })() : "Recent", 
          vn: item.published_at ? (() => { const d = new Date(item.published_at); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; })() : "Gần đây" 
        }
      }))
    : []

  const categories = [
    { tag: "ODA", tagColor: "bg-blue-500/10 text-blue-500" },
    { tag: "IT", tagColor: "bg-emerald-500/10 text-emerald-500" },
    { tag: "Policy", tagColor: "bg-purple-500/10 text-purple-500" },
  ]

  return (
    <section id={id} className={`${isFullPage ? 'pt-0 pb-28' : 'py-28'} relative overflow-hidden bg-background transition-colors duration-300`}>
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {!isFullPage && (
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-6 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md relative overflow-hidden group shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-primary relative z-10" />
              <span className="text-sm font-bold tracking-widest uppercase text-primary relative z-10">
                {t('landing.insights.label')}
              </span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tight leading-[1.2] whitespace-pre-line"
            >
              {category ? (
                <>
                  <span className="text-primary italic">{category}</span> Insights
                </>
              ) : (
                t('landing.insights.section_title')
              )}
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl leading-relaxed font-light whitespace-pre-line"
            >
              {category === 'ODA' 
                ? t('landing.insights.desc_oda')
                : (category === 'IT' 
                  ? t('landing.insights.desc_it')
                  : t('landing.insights.desc'))}
            </motion.p>
          </div>
        )}

        {/* Active Tag Filter Indicator */}
        {activeTag && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center mb-4"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <Tag className="h-4 w-4" />
              <span className="text-sm font-bold">Tag: {activeTag}</span>
              <Link 
                href={category ? `/insights?category=${category}` : '/insights'}
                className="ml-2 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/40 transition-colors"
              >
                <span className="text-xs">✕</span>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Insights Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insightItems.map((insight: any, index: number) => {
            return (
              <div
                key={index}
                className="group relative bg-card/80 backdrop-blur-md border border-border/50 rounded-[2rem] p-0 overflow-hidden hover:bg-card transition-all duration-500 hover:border-primary/30 hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)] flex flex-col"
              >
                {/* Stretched Link for the entire card */}
                {insight.id && (
                  <Link href={`/insights/${insight.id}`} className="absolute inset-0 z-30" />
                )}

                {/* Thumbnail Image */}
                <div className="relative h-48 w-full overflow-hidden">
                  {insight.thumbnail_url ? (
                    <img 
                      src={insight.thumbnail_url} 
                      alt={insight.title[language]} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--page-bg)] via-[var(--page-bg)]/20 to-transparent opacity-80" />
                </div>

                <div className="p-6 flex flex-col flex-grow">
                  {/* AI Tags - Minimal Hashtags */}
                  <div className="flex flex-wrap gap-2 mb-3 relative z-40">
                    {insight.tags?.slice(0, 2).map((tag: string) => (
                      <Link 
                        key={tag}
                        href={`/insights?tag=${encodeURIComponent(tag)}`}
                        className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors uppercase tracking-widest"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>

                  {/* Title */}
                  <h3 className="text-lg md:text-xl font-bold text-foreground mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-snug min-h-[3.5rem]">
                    {insight.title[language]}
                  </h3>

                  {/* Summary instead of Perspective */}
                  <p className="text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-3 mb-6 font-light whitespace-pre-line">
                    {insight.summary[language]}
                  </p>

                  {/* Footer */}
                    <div className="flex items-center justify-between pt-5 border-t border-[var(--border)] mt-auto">
                    <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]/60 font-medium uppercase tracking-wider">
                      <Clock className="h-3 w-3" />
                      {insight.date[language]}
                    </div>
                    
                    {insight.id ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors group/btn">
                        {dictionary.landing.insights.viewDetails}
                        <ArrowUpRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-primary opacity-30 cursor-not-allowed">
                        {dictionary.landing.insights.viewDetails}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>


        {/* Conditional Controls (Pagination or View More) */}
        {isFullPage ? (
          /* Pagination Controls */
          <div className="flex items-center justify-center gap-4 mt-16">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="h-12 px-8 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm font-bold hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-foreground"
            >
              <ArrowRight className="h-4 w-4 rotate-180" /> {t('common.prev')}
            </button>
            
            <div className="h-12 w-12 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center font-bold text-primary">
              {page}
            </div>

            <button 
              onClick={() => setPage(p => p + 1)}
              disabled={(insights && insights.length < limit) || isLoading}
              className="h-12 px-8 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm font-bold hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-foreground"
            >
              {t('common.next')} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* View More Button for Home */
          <div className="flex justify-center mt-16">
            <GlassButton href="/insights">
              {language === 'kr' ? '더 보기' : (language === 'en' ? 'View More' : 'Xem thêm')} 
            </GlassButton>
          </div>
        )}
      </div>
    </section>
  )
}
