'use client'

import { useEffect } from 'react'
import { roadmapCss } from './roadmap.css'
import { roadmapMarkup } from './roadmap-markup'
import { startRoadmap } from './roadmap-scene'

let started = false

export function RoadmapView() {
  useEffect(() => {
    // the scene hooks window-level listeners and draws into fixed elements; strict mode's double effect must not start it twice
    if (started) return
    started = true
    startRoadmap()
  }, [])

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,500&family=Inter:wght@300;400;500;600&family=Noto+Sans+KR:wght@400;500;600&display=swap"
      />
      <style>{roadmapCss}</style>
      <div dangerouslySetInnerHTML={{ __html: roadmapMarkup }} />
    </>
  )
}
