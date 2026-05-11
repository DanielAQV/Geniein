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
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
            >

              <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                {t('about.projects.label')}
              </span>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6 tracking-tighter">
              {t('about.projects.title')}
            </h2>
            <p className="text-base text-muted-foreground font-light leading-relaxed break-keep whitespace-pre-line">
              {t('about.projects.desc')}
            </p>
          </div>
        </div>

        <div className="space-y-12">
          {projects.map((project, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="group relative grid lg:grid-cols-12 gap-0 border border-border/50 bg-card/50 backdrop-blur-md hover:bg-card/80 transition-all overflow-hidden rounded-3xl shadow-2xl"
            >
              {/* Project Info */}
              <div className="lg:col-span-8 p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-border/50">
                <div className="flex items-center gap-5 mb-10">
                  <div className="hidden sm:block p-4 rounded-xl bg-card/30 border border-border/50 shadow-inner">
                    {project.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary tracking-widest uppercase mb-1">{project.category[language]}</div>
                    <h3 className="text-2xl lg:text-3xl font-bold text-foreground leading-snug tracking-tight">{project.title[language]}</h3>
                  </div>
                </div>
                <p className="text-base lg:text-lg text-muted-foreground font-light leading-relaxed mb-12 break-keep">
                  {project.description[language]}
                </p>
              </div>

              {/* Project Metrics */}
              <div className="lg:col-span-4 p-10 lg:p-12 bg-primary/[0.04] flex flex-col justify-center relative overflow-hidden border-l border-border/30">
                <div className="space-y-6 relative z-10">
                  {project.metrics.map((metric, mIdx) => (
                    <div 
                      key={mIdx} 
                      className="group/metric p-6 rounded-2xl bg-card/20 border border-border/30 hover:bg-card/40 transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/metric:bg-primary group-hover/metric:text-white transition-colors duration-300">
                          {mIdx === 0 ? <Layout className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </div>
                        <div className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                          {metric.label[language]}
                        </div>
                      </div>
                      <div className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                        {typeof metric.value === 'string' ? metric.value : metric.value[language]}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Subtle Background Glow */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
