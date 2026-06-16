"use client";
import { useState } from "react";

import { ArrowUpRight, Clock, Sparkles, ArrowRight, Tag } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLanguage } from "@/lib/i18n/language-context";

import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/api";

interface AIInsightsProps {
  isFullPage?: boolean;
  category?: string;
  id?: string;
}

export function AIInsights({
  isFullPage = false,
  category,
  id = "insights",
}: AIInsightsProps) {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");
  const [page, setPage] = useState(1);
  const limit = isFullPage ? 6 : 3;

  // Update API URL based on category and tag
  let apiUrl = `/insights?limit=${limit}&page=${page}`;
  if (category) apiUrl += `&category=${category}`;
  if (activeTag) apiUrl += `&tag=${encodeURIComponent(activeTag)}`;

  const { data: insights, isLoading } = useSWR(apiUrl, fetcher);

  // Use API data if available, otherwise return empty array (remove static demo fallback)
  const insightItems =
    insights && insights.length > 0
      ? insights.map((item: any) => ({
          id: item.id,
          title: {
            kr: item.title_kr || "인사이트 제목 준비 중",
            en: item.title_en || "Insight title coming soon",
            vn: item.title_vn || "Tiêu đề nội dung sắp ra mắt",
          },
          summary: {
            kr: item.summary_kr || "내용을 분석하고 있습니다.",
            en: item.summary_en || "Analyzing content...",
            vn: item.summary_vn || "Đang phân tích nội dung...",
          },
          perspective: {
            kr: item.perspective_kr,
            en: item.perspective_en,
            vn: item.perspective_vn,
          },
          thumbnail_url: item.thumbnail_url,
          category: item.category,
          date: {
            kr: item.published_at
              ? (() => {
                  const d = new Date(item.published_at);
                  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
                })()
              : "최근",
            en: item.published_at
              ? (() => {
                  const d = new Date(item.published_at);
                  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
                })()
              : "Recent",
            vn: item.published_at
              ? (() => {
                  const d = new Date(item.published_at);
                  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
                })()
              : "Gần đây",
          },
        }))
      : [];

  return (
    <section
      id={id}
      className={`${isFullPage ? "pt-0 pb-16 md:pb-20 lg:pb-28" : "py-16 md:py-20 lg:py-28"} relative overflow-hidden bg-background transition-colors duration-300`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {!isFullPage && (
          <div className="flex flex-col items-center text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-3 inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md relative overflow-hidden group shadow-lg"
            >
              <Sparkles className="h-4 w-4 text-primary relative z-10" />
              <span className="text-sm font-bold tracking-widest uppercase text-primary relative z-10">
                {t("landing.insights.label")}
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-3xl tracking-[-0.8px] md:tracking-[-1px] font-bold text-foreground mb-3 leading-[1.2] whitespace-pre-line"
            >
              {category ? (
                <>
                  <span className="text-primary italic">{category}</span>{" "}
                  Insights
                </>
              ) : (
                t("landing.insights.section_title")
              )}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-[15px] leading-[24px] md:text-base md:leading-[26px] lg:text-lg lg:leading-relaxed text-muted-foreground max-w-2xl font-light whitespace-pre-line"
            >
              {category === "ODA"
                ? t("landing.insights.desc_oda")
                : category === "IT"
                  ? t("landing.insights.desc_it")
                  : t("landing.insights.desc")}
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
                href={category ? `/insights?category=${category}` : "/insights"}
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
                className="group relative bg-[var(--card-dark)] border border-[var(--border-card)] rounded-[16px] overflow-hidden shadow-md transition-all duration-500 hover:border-primary/40 hover:shadow-lg flex flex-col"
              >
                {/* Stretched Link for the entire card */}
                {insight.id && (
                  <Link
                    href={`/insights/${insight.id}`}
                    className="absolute inset-0 z-30"
                  />
                )}

                {/* Thumbnail Image */}
                <div className="relative h-64 w-full overflow-hidden">
                  {insight.thumbnail_url ? (
                    <img
                      src={insight.thumbnail_url}
                      alt={insight.title[language]}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-primary/40" />
                    </div>
                  )}
                </div>

                <div className="px-4 py-8 flex flex-col gap-6 flex-grow">
                  <div className="flex flex-col gap-2">
                    {/* Title */}
                    <h3 className="text-xl font-bold text-[var(--text-heading)] tracking-[-0.5px] line-clamp-2 group-hover:text-primary transition-colors leading-7 min-h-[3.5rem]">
                      {insight.title[language]}
                    </h3>

                    {/* Summary */}
                    <p className="text-sm font-medium text-[var(--text-sub)] leading-5 line-clamp-3 whitespace-pre-line">
                      {insight.summary[language]}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-sub)] mt-auto">
                    <Clock className="h-4 w-4" />
                    {insight.date[language]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conditional Controls (Pagination or View More) */}
        {isFullPage ? (
          /* Pagination Controls */
          <div className="flex items-center justify-center gap-4 mt-16">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="h-12 px-8 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm font-bold hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-foreground"
            >
              <ArrowRight className="h-4 w-4 rotate-180" /> {t("common.prev")}
            </button>

            <div className="h-12 w-12 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center font-bold text-primary">
              {page}
            </div>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(insights && insights.length < limit) || isLoading}
              className="h-12 px-8 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] text-sm font-bold hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 text-foreground"
            >
              {t("common.next")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* View More Button for Home */
          <div className="flex justify-center mt-16">
            <Link
              href="/insights"
              className="inline-flex py-2 w-full md:w-fit items-center justify-center md:justify-start gap-2 rounded-full border border-slate-200 dark:border-white/10 bg-white pl-6 pr-5 text-base font-bold text-[#12161f] shadow-sm transition-all hover:gap-3 hover:bg-slate-50"
            >
              {t("common.more")}
              <ArrowUpRight className="size-[22px]" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
