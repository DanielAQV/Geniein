"use client"

import { motion } from "framer-motion"
import { Globe, Zap, Layout, Shield } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { dictionary } from "@/lib/i18n/dictionary"

export function ProjectsShowcase() {
  const { t, language } = useLanguage()
  const projectData = dictionary.about.projects.items

  const projects = projectData.map((data, idx) => ({
    ...data,
    icon: idx === 0
      ? <Zap className="h-6 w-6 text-yellow-400" />
      : <Globe className="h-6 w-6 text-blue-400" />
  }))

  return (
    <section id="projects" className="py-28 relative bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header — 96px gap to the cards (Figma) */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center rounded-full border border-primary/30 bg-primary/5 px-[17px] py-[5px]"
          >
            <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
              {t('about.projects.label')}
            </span>
          </motion.div>
          <h2 className="mt-6 text-4xl sm:text-5xl font-bold text-foreground tracking-tight leading-tight">
            {t('about.projects.title')}
          </h2>
          <p className="mt-6 text-base sm:text-lg text-muted-foreground font-light leading-relaxed break-keep whitespace-pre-line">
            {t('about.projects.desc')}
          </p>
        </div>

        <div className="space-y-12">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="group relative grid lg:grid-cols-12 overflow-hidden rounded-[20px] bg-[var(--card-glass)] backdrop-blur-md shadow-md hover:shadow-lg transition-shadow duration-500 lg:min-h-[482px]"
            >
              {/* Project Metrics with Background Image */}
              <div className="relative lg:col-span-4 flex items-center overflow-hidden bg-[var(--card-dark)]">
                <img
                  src="/images/about/project.png"
                  alt="Project Background"
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                  style={{ opacity: 'var(--hero-img-opacity)' }}
                />
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[var(--card-dark)]/80 to-transparent" />
                <div className="relative z-10 flex w-full flex-col gap-6 p-6 sm:p-8 lg:p-10">
                  {project.metrics.map((metric, mIdx) => (
                    <div
                      key={mIdx}
                      className="rounded-2xl border border-[var(--border-card-strong)] bg-[var(--card-glass)] p-6 backdrop-blur-sm transition-colors duration-300 hover:bg-[var(--card-glass-hover)]"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="rounded-xl bg-[#5874ea]/15 p-2 text-[#5874ea]">
                          {mIdx === 0 ? <Layout className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </div>
                        <div className="text-xs font-bold text-[var(--text-heading)]/70 uppercase tracking-wider">
                          {metric.label[language]}
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-[var(--text-heading)] leading-tight">
                        {typeof metric.value === 'string' ? metric.value : metric.value[language]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Project Info — dark panel */}
              <div className="lg:col-span-8 flex flex-col justify-center gap-10 bg-[var(--card-dark)] px-8 py-10 lg:px-16 lg:py-8 border-t lg:border-t-0 lg:border-l border-border/30">
                <div className="flex flex-col gap-5">
                  <div className="w-fit rounded-2xl border border-[var(--border-card-strong)] bg-[var(--card-glass)] p-4 shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)]">
                    {project.icon}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-bold text-[#5874ea] tracking-[0.1em] uppercase">
                      {project.category[language]}
                    </div>
                    <h3 className="text-3xl lg:text-4xl font-bold text-[var(--text-heading)] leading-snug tracking-tight">
                      {project.title[language]}
                    </h3>
                  </div>
                </div>
                <p className="text-lg lg:text-xl text-[var(--text-sub)] font-light leading-relaxed break-keep">
                  {project.description[language]}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
