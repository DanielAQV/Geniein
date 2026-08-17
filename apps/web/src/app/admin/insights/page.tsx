"use client"

import useSWR from "swr"
import { adminFetcher } from "@/lib/api"
import { 
  MoreVertical, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  Clock,
  Plus
} from "lucide-react"

export default function AdminInsightsPage() {
  // 같은 오리진의 BFF. 세션 쿠키로 인가되고, NestJS 는 직접 노출되지 않는다.
  const { data: insights, isLoading } = useSWR('/api/admin/insights', adminFetcher)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
            <CheckCircle className="h-3 w-3" /> Published
          </span>
        )
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20">
            <Clock className="h-3 w-3" /> Draft
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-muted-foreground text-xs font-medium border border-white/10">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">AI Insights</h1>
          <p className="text-muted-foreground">Manage and review AI-generated ODA & IT content.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 active:scale-95">
          <Plus className="h-4 w-4" />
          Create New
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total Insights", value: insights?.length || 0, color: "text-primary" },
          { label: "Published", value: insights?.filter((i: any) => i.publish_status === 'published').length || 0, color: "text-emerald-500" },
          { label: "Drafts", value: insights?.filter((i: any) => i.publish_status === 'draft').length || 0, color: "text-amber-500" },
        ].map((stat, i) => (
          <div key={i} className="bg-[#050810] border border-white/5 p-6 rounded-2xl">
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-[#050810] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Title</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Category</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-8">
                      <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </td>
                  </tr>
                ))
              ) : insights?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No insights found.
                  </td>
                </tr>
              ) : (
                insights?.map((insight: any) => (
                  <tr key={insight.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-foreground line-clamp-1">{insight.title_kr}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 uppercase tracking-tighter">
                        <ExternalLink className="h-3 w-3" /> {insight.source_document_id?.substring(0, 40)}...
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm font-medium uppercase tracking-widest text-primary/80">{insight.category}</span>
                    </td>
                    <td className="px-6 py-5">
                      {getStatusBadge(insight.publish_status)}
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {new Date(insight.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
