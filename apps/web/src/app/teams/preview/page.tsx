
import { notFound } from 'next/navigation'
import { PreviewClient } from './preview-client'

export default function TeamsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <PreviewClient />
}
