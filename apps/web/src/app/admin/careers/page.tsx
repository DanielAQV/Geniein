"use client"

/**
 * 관리자 채용 공고 관리.
 *
 * 데이터는 같은 오리진의 BFF(/api/admin/careers)만 부른다 — 세션 쿠키로 인가되고,
 * NestJS 는 직접 노출되지 않는다. (admin/insights 와 같은 구조)
 *
 * 다국어 정책: KR 만 필수. EN/VN 은 비워도 되고, 프론트가 KR 로 폴백한다.
 */

import { useMemo, useState } from "react"
import useSWR from "swr"
import { adminFetcher } from "@/lib/api"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Archive,
  Edit3,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react"

type Lang = "kr" | "en" | "vn"
const LANGS: Lang[] = ["kr", "en", "vn"]

type JobPostingRow = {
  id: string
  department_key: string
  location_key: string
  employment_type: string
  publish_status: string
  deadline: string | null
  sort_order: number
  view_count: number
  created_at: string
  [key: string]: unknown
}

const TEXT_GROUPS = ["title", "department", "location", "employment", "experience"] as const
const LIST_GROUPS = ["tags", "responsibilities", "requirements", "preferred"] as const

type TextGroup = (typeof TEXT_GROUPS)[number]
type ListGroup = (typeof LIST_GROUPS)[number]

type PerLang = Record<Lang, string>
const emptyPerLang = (): PerLang => ({ kr: "", en: "", vn: "" })

type FormState = {
  department_key: string
  location_key: string
  employment_type: string
  publish_status: string
  /** "" = 상시 채용(NULL) */
  deadline: string
  sort_order: string
  text: Record<TextGroup, PerLang>
  list: Record<ListGroup, PerLang>
}

const emptyForm = (): FormState => ({
  department_key: "",
  location_key: "korea",
  employment_type: "fulltime",
  publish_status: "draft",
  deadline: "",
  sort_order: "0",
  text: Object.fromEntries(TEXT_GROUPS.map((g) => [g, emptyPerLang()])) as Record<TextGroup, PerLang>,
  list: Object.fromEntries(LIST_GROUPS.map((g) => [g, emptyPerLang()])) as Record<ListGroup, PerLang>,
})

function formFromRow(row: JobPostingRow): FormState {
  const form = emptyForm()
  form.department_key = row.department_key ?? ""
  form.location_key = row.location_key ?? "korea"
  form.employment_type = row.employment_type ?? "fulltime"
  form.publish_status = row.publish_status ?? "draft"
  form.deadline = row.deadline ?? ""
  form.sort_order = String(row.sort_order ?? 0)

  for (const group of TEXT_GROUPS) {
    for (const lang of LANGS) {
      form.text[group][lang] = (row[`${group}_${lang}`] as string | null) ?? ""
    }
  }
  for (const group of LIST_GROUPS) {
    for (const lang of LANGS) {
      const value = row[`${group}_${lang}`] as string[] | null
      form.list[group][lang] = (value ?? []).join("\n")
    }
  }
  return form
}

/** 배열 필드는 줄바꿈으로 나눈다. 빈 줄은 버린다. */
const toLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

function payloadFromForm(form: FormState) {
  const payload: Record<string, unknown> = {
    department_key: form.department_key.trim(),
    location_key: form.location_key,
    employment_type: form.employment_type,
    publish_status: form.publish_status,
    // 빈 문자열은 상시 채용이라는 뜻으로 NULL 이 된다 (상류에서 처리)
    deadline: form.deadline || null,
    sort_order: Number(form.sort_order) || 0,
  }
  for (const group of TEXT_GROUPS) {
    for (const lang of LANGS) {
      payload[`${group}_${lang}`] = form.text[group][lang].trim() || null
    }
  }
  for (const group of LIST_GROUPS) {
    for (const lang of LANGS) {
      const lines = toLines(form.list[group][lang])
      payload[`${group}_${lang}`] = lang === "kr" ? lines : lines.length ? lines : null
    }
  }
  return payload
}

const GROUP_LABEL: Record<TextGroup | ListGroup, string> = {
  title: "Title",
  department: "Team label",
  location: "Location label",
  employment: "Employment label",
  experience: "Experience",
  tags: "Tags",
  responsibilities: "Responsibilities",
  requirements: "Requirements",
  preferred: "Nice to have",
}

function StatusBadge({ status }: { status: string }) {
  if (status === "published") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
        <CheckCircle className="h-3 w-3" /> Published
      </span>
    )
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium border border-border">
        <Archive className="h-3 w-3" /> Archived
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium border border-amber-500/20">
      <Clock className="h-3 w-3" /> Draft
    </span>
  )
}

const inputClass =
  "w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary/50 transition-colors"

export default function AdminCareersPage() {
  const { data, isLoading, error, mutate } = useSWR<JobPostingRow[]>(
    "/api/admin/careers",
    adminFetcher,
  )

  const [editing, setEditing] = useState<JobPostingRow | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [lang, setLang] = useState<Lang>("kr")
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const stats = useMemo(() => {
    const rows = data ?? []
    const soon = rows.filter((row) => {
      if (row.publish_status !== "published" || !row.deadline) return false
      const days = (new Date(row.deadline).getTime() - Date.now()) / 86_400_000
      return days >= 0 && days <= 14
    })
    return [
      { label: "Total", value: rows.length, color: "text-primary" },
      {
        label: "Published",
        value: rows.filter((r) => r.publish_status === "published").length,
        color: "text-emerald-500",
      },
      {
        label: "Drafts",
        value: rows.filter((r) => r.publish_status === "draft").length,
        color: "text-amber-500",
      },
      { label: "Closing in 14d", value: soon.length, color: "text-sky-600" },
    ]
  }, [data])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setLang("kr")
    setFormError(null)
    setFormOpen(true)
  }

  const openEdit = (row: JobPostingRow) => {
    setEditing(row)
    setForm(formFromRow(row))
    setLang("kr")
    setFormError(null)
    setFormOpen(true)
  }

  const save = async () => {
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch(
        editing ? `/api/admin/careers/${editing.id}` : "/api/admin/careers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payloadFromForm(form)),
        },
      )
      if (!res.ok) {
        const detail = await res.json().catch(() => null)
        throw new Error(detail?.message ?? `저장에 실패했습니다 (${res.status})`)
      }
      setFormOpen(false)
      await mutate()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "저장에 실패했습니다")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (row: JobPostingRow) => {
    // 지원자 이력이 걸릴 수 있는 데이터다. 한 번은 물어본다.
    if (!window.confirm(`"${row.title_kr}" 공고를 삭제할까요? 되돌릴 수 없습니다.`)) return
    const res = await fetch(`/api/admin/careers/${row.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    })
    if (res.ok) await mutate()
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Careers</h1>
          <p className="text-muted-foreground">
            Manage job postings shown on /careers. Korean is required; English and Vietnamese fall
            back to Korean.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Create New
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-card border border-border p-6 rounded-2xl">
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          공고를 불러오지 못했습니다. NestJS(/careers/admin)와 ADMIN_SERVICE_TOKEN 설정을
          확인하세요.
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/60">
                {["Title", "Team", "Location", "Type", "Status", "Deadline", ""].map((head, i) => (
                  <th
                    key={i}
                    className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground ${
                      i === 6 ? "text-right" : ""
                    }`}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={7} className="px-6 py-8">
                        <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </td>
                    </tr>
                  ))
              ) : !data || data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No job postings yet.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="group hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-foreground line-clamp-1">
                        {String(row.title_kr ?? "")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {String(row.title_en ?? "— (EN 미입력, KR 폴백)")}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {String(row.department_kr ?? row.department_key)}
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">{row.location_key}</td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {row.employment_type}
                    </td>
                    <td className="px-6 py-5">
                      <StatusBadge status={row.publish_status} />
                    </td>
                    <td className="px-6 py-5 text-sm text-muted-foreground">
                      {row.deadline ?? "상시"}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(row)}
                          aria-label="Edit"
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(row)}
                          aria-label="Delete"
                          className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Editor drawer */}
      {formOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-card p-8">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {editing ? "Edit posting" : "New posting"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Korean fields are required. English and Vietnamese are optional.
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                aria-label="Close"
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 공통 필드 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Team key</span>
                <input
                  value={form.department_key}
                  onChange={(e) => setForm({ ...form, department_key: e.target.value })}
                  placeholder="oda / engineering / operations"
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Location</span>
                <select
                  value={form.location_key}
                  onChange={(e) => setForm({ ...form, location_key: e.target.value })}
                  className={inputClass}
                >
                  <option value="korea">Korea</option>
                  <option value="vietnam">Vietnam</option>
                  <option value="philippines">Philippines</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Employment type</span>
                <select
                  value={form.employment_type}
                  onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                  className={inputClass}
                >
                  <option value="fulltime">fulltime</option>
                  <option value="contract">contract</option>
                  <option value="intern">intern</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Status</span>
                <select
                  value={form.publish_status}
                  onChange={(e) => setForm({ ...form, publish_status: e.target.value })}
                  className={inputClass}
                >
                  <option value="draft">draft</option>
                  <option value="published">published</option>
                  <option value="archived">archived</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Deadline (비우면 상시 채용)</span>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-muted-foreground">Sort order</span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  className={inputClass}
                />
              </label>
            </div>

            {/* 언어 탭 */}
            <div className="mt-8 flex gap-2">
              {LANGS.map((code) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                    lang === code
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {code}
                  {code === "kr" && " *"}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-4">
              {TEXT_GROUPS.map((group) => (
                <label key={group} className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {GROUP_LABEL[group]} ({lang})
                  </span>
                  <input
                    value={form.text[group][lang]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        text: { ...form.text, [group]: { ...form.text[group], [lang]: e.target.value } },
                      })
                    }
                    className={inputClass}
                  />
                </label>
              ))}

              {LIST_GROUPS.map((group) => (
                <label key={group} className="flex flex-col gap-1.5 text-sm">
                  <span className="text-muted-foreground">
                    {GROUP_LABEL[group]} ({lang}) — 한 줄에 하나
                  </span>
                  <textarea
                    rows={4}
                    value={form.list[group][lang]}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        list: { ...form.list, [group]: { ...form.list[group], [lang]: e.target.value } },
                      })
                    }
                    className={`${inputClass} resize-none`}
                  />
                </label>
              ))}
            </div>

            {formError && (
              <p className="mt-6 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" /> {formError}
              </p>
            )}

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setFormOpen(false)}
                className="rounded-xl border border-border px-6 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-70"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
