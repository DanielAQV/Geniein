"use client"

import { motion } from "framer-motion"
import { BarChart3, Globe, Zap, Layout, Shield } from "lucide-react"
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
    <section id="projects" className="py-32 relative bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-24 gap-8">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="mb-8 inline-flex items-center gap-2 px-4 py-1 rounded-sm border border-primary/30 bg-primary/5"
            >
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold tracking-[0.2em] uppercase text-primary">
                {t('about.projects.label')}
              </span>
            </motion.div>
            <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6 tracking-tighter">
              {t('about.projects.title')}
            </h2>
            <p className="text-lg text-muted-foreground font-light leading-relaxed break-keep whitespace-pre-line">
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
              className="group relative grid lg:grid-cols-12 gap-0 border border-white/10 bg-white/[0.05] backdrop-blur-md hover:bg-white/[0.08] transition-all overflow-hidden rounded-3xl shadow-2xl"
            >
              {/* Project Info */}
              <div className="lg:col-span-8 p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-white/10">
                <div className="flex items-center gap-5 mb-10">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                    {project.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary tracking-widest uppercase mb-1">{project.category[language]}</div>
                    <h3 className="text-3xl lg:text-4xl font-bold text-foreground leading-snug tracking-tight">{project.title[language]}</h3>
                  </div>
                </div>
                <p className="text-lg lg:text-xl text-muted-foreground font-light leading-relaxed mb-12 break-keep">
                  {project.description[language]}
                </p>
              </div>

              {/* Project Metrics */}
              <div className="lg:col-span-4 p-10 lg:p-12 bg-primary/[0.04] flex flex-col justify-center relative overflow-hidden border-l border-white/5">
                <div className="space-y-6 relative z-10">
                  {project.metrics.map((metric, mIdx) => (
                    <div 
                      key={mIdx} 
                      className="group/metric p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all duration-300"
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover/metric:bg-primary group-hover/metric:text-white transition-colors duration-300">
                          {mIdx === 0 ? <Layout className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                        </div>
                        <div className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wider">
                          {metric.label[language]}
                        </div>
                      </div>
                      <div className="text-xl lg:text-2xl font-bold text-foreground leading-tight">
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
