'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { useAdminTheme } from '@/components/admin/AdminThemeProvider'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface AnalyticsData {
  period: string
  days: number
  totalViews: number
  uniqueVisitors: number
  prevTotalViews: number
  prevUniqueVisitors: number
  topPosts: Array<{
    post_id: number | null
    post_slug: string | null
    post_title: string | null
    views: number
  }>
  viewsByDay: Array<{ date: string; views: number; unique: number }>
  viewsByHour: Array<{ hour: number; label: string; views: number }>
  viewsByWeekday: Array<{ weekday: string; weekdayIndex: number; views: number }>
  referrers: Array<{ referrer: string; views: number }>
  pageTypes: Array<{ type: string; views: number }>
  todayViews: number
  yesterdayViews: number
  onlineNow: number
}

interface BlogStats {
  total: number
  published: number
  drafts: number
  categories: number
  tags: number
}

interface Overview {
  automation: { enabled: boolean; interval_hours: number; last_run_at: string | null; next_run_at: string | null }
  newsletter: { active: number }
  sources: { rssEnabled: number; rssTotal: number; crawlersEnabled: number; crawlersTotal: number }
  apiTokens: { active: number }
  recentActivity: Array<{
    id: number
    triggered_by: string
    status: string
    message: string | null
    post_id: number | null
    started_at: string
  }>
}

function calcChange(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  const pct = ((current - previous) / previous) * 100
  return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 }
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.round(hrs / 24)
  return `há ${days}d`
}

function untilTime(iso: string | null): string {
  if (!iso) return '—'
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'em breve'
  const min = Math.round(diff / 60000)
  if (min < 60) return `em ${min} min`
  const hrs = Math.round(min / 60)
  if (hrs < 24) return `em ${hrs}h`
  const days = Math.round(hrs / 24)
  return `em ${days}d`
}

/** Mini sparkline desenhado inline com SVG — leve, sem peso de Chart.js por card. */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2 || data.every((v) => v === 0)) {
    return <div className="h-7 mt-2 rounded admin-progress-bg opacity-40" />
  }
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 100
  const h = 28
  const step = w / (data.length - 1)
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
  const line = pts.join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  const gradId = `spark-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-7 w-full mt-2 overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function StatCard({
  label,
  value,
  sub,
  badge,
  iconClass,
  icon,
  spark,
  sparkColor,
}: {
  label: string
  value: string
  sub: string
  badge?: { value: string; positive: boolean }
  iconClass: string
  icon: React.ReactNode
  spark?: number[]
  sparkColor?: string
}) {
  return (
    <div className="admin-stat">
      <div className="flex items-start justify-between mb-3">
        <div className={iconClass}>{icon}</div>
        {badge && (
          <span className={badge.positive ? 'admin-badge-up' : 'admin-badge-down'}>
            {badge.value}
          </span>
        )}
      </div>
      <p className="text-[26px] font-bold leading-none mb-1 admin-text-primary">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide admin-text-secondary">{label}</p>
      <p className="text-[11px] mt-0.5 admin-text-secondary">{sub}</p>
      {spark && <Sparkline data={spark} color={sparkColor || '#2563eb'} />}
    </div>
  )
}

function SectionCard({ title, action, children, className = '' }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`admin-card overflow-hidden ${className}`}>
      <div className="admin-card-header flex items-center justify-between">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SystemCard({
  href,
  label,
  value,
  hint,
  tone,
  icon,
  active,
}: {
  href: string
  label: string
  value: string
  hint: string
  tone: string
  icon: React.ReactNode
  active?: boolean
}) {
  return (
    <Link href={href} className="admin-stat group flex items-center gap-4 no-underline">
      <div className={tone}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold leading-tight admin-text-primary truncate">{value}</p>
          {active !== undefined && (
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: active ? '#22c55e' : '#94a3b8' }}
            />
          )}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-wide admin-text-secondary truncate">{label}</p>
        <p className="text-[11px] admin-text-secondary truncate">{hint}</p>
      </div>
      <svg className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  )
}

const STATUS_TONE: Record<string, { dot: string; label: string }> = {
  success: { dot: '#22c55e', label: 'Publicado' },
  running: { dot: '#3b82f6', label: 'Em execução' },
  skipped: { dot: '#f59e0b', label: 'Ignorado' },
  error: { dot: '#ef4444', label: 'Erro' },
}

export default function DashboardClient() {
  const { theme } = useAdminTheme()
  const isDark = theme === 'dark'

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [stats, setStats] = useState<BlogStats>({ total: 0, published: 0, drafts: 0, categories: 0, tags: 0 })
  const [overview, setOverview] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, blogRes, overviewRes] = await Promise.all([
        fetch(`/api/admin/analytics?period=${period}`),
        fetch('/api/admin/posts?limit=1'),
        fetch('/api/admin/dashboard-overview'),
      ])
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json())
      if (overviewRes.ok) setOverview(await overviewRes.json())
      if (blogRes.ok) {
        const d = await blogRes.json()
        setStats((s) => ({ ...s, total: d.total ?? 0 }))
      }

      const [pubRes, catRes, tagRes] = await Promise.all([
        fetch('/api/admin/posts?limit=1&status=published'),
        fetch('/api/admin/categories'),
        fetch('/api/admin/tags'),
      ])
      if (pubRes.ok) {
        const d = await pubRes.json()
        setStats((s) => ({ ...s, published: d.total ?? 0, drafts: s.total - (d.total ?? 0) }))
      }
      if (catRes.ok) {
        const d = await catRes.json()
        setStats((s) => ({ ...s, categories: d.categories?.length ?? 0 }))
      }
      if (tagRes.ok) {
        const d = await tagRes.json()
        setStats((s) => ({ ...s, tags: d.tags?.length ?? 0 }))
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const periods = [
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '365d', label: '12m' },
  ]

  // Theme-aware chart colours
  const chartColors = isDark
    ? {
        line1: '#60a5fa',
        line1Fill: 'rgba(96,165,250,0.1)',
        line2: '#a78bfa',
        line2Fill: 'rgba(167,139,250,0.06)',
        barPeak: 'rgba(251,146,60,0.9)',
        barRest: 'rgba(96,165,250,0.65)',
        tooltip: { bg: '#1e2336', title: '#e2e8f0', body: '#94a3b8', border: 'rgba(255,255,255,0.08)' },
        grid: 'rgba(255,255,255,0.05)',
        tick: '#64748b',
        legend: '#94a3b8',
      }
    : {
        line1: '#2563eb',
        line1Fill: 'rgba(37,99,235,0.08)',
        line2: '#8b5cf6',
        line2Fill: 'rgba(139,92,246,0.04)',
        barPeak: 'rgba(245,138,45,0.9)',
        barRest: 'rgba(37,99,235,0.6)',
        tooltip: { bg: '#1e2130', title: '#e5e7eb', body: '#9ca3af', border: 'rgba(0,0,0,0.1)' },
        grid: 'rgba(0,0,0,0.04)',
        tick: '#9ca3af',
        legend: '#6b7280',
      }

  const d = analytics
  const viewsChange = d ? calcChange(d.totalViews, d.prevTotalViews) : { value: '0%', positive: true }
  const visitorsChange = d ? calcChange(d.uniqueVisitors, d.prevUniqueVisitors) : { value: '0%', positive: true }
  const todayChange = d ? calcChange(d.todayViews, d.yesterdayViews) : { value: '0%', positive: true }

  const sparkViews = d ? d.viewsByDay.map((v) => v.views) : []
  const sparkUnique = d ? d.viewsByDay.map((v) => v.unique) : []

  const hasViews = !!d && d.totalViews > 0
  const hasContent = stats.total > 0

  const dailyChartData = d
    ? {
        labels: d.viewsByDay.map((v) =>
          new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        ),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByDay.map((v) => v.views),
            borderColor: chartColors.line1,
            backgroundColor: chartColors.line1Fill,
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
          {
            label: 'Únicos',
            data: d.viewsByDay.map((v) => v.unique),
            borderColor: chartColors.line2,
            backgroundColor: chartColors.line2Fill,
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
            borderWidth: 2,
          },
        ],
      }
    : null

  const barBg = (arr: number[]) =>
    arr.map((v) => (v === Math.max(...arr) ? chartColors.barPeak : chartColors.barRest))

  const hourlyChartData = d
    ? {
        labels: d.viewsByHour.map((h) => `${h.hour}h`),
        datasets: [{ label: 'Views', data: d.viewsByHour.map((h) => h.views), backgroundColor: barBg(d.viewsByHour.map((h) => h.views)), borderRadius: 4 }],
      }
    : null

  const weekdayChartData = d
    ? {
        labels: d.viewsByWeekday.map((w) => w.weekday),
        datasets: [{ label: 'Views', data: d.viewsByWeekday.map((w) => w.views), backgroundColor: barBg(d.viewsByWeekday.map((w) => w.views)), borderRadius: 4 }],
      }
    : null

  const pageTypeChartData =
    d && d.pageTypes.length > 0
      ? {
          labels: d.pageTypes.map((p) => p.type),
          datasets: [{
            data: d.pageTypes.map((p) => p.views),
            backgroundColor: isDark
              ? ['rgba(96,165,250,0.85)','rgba(251,146,60,0.85)','rgba(74,222,128,0.85)','rgba(167,139,250,0.85)','rgba(244,114,182,0.85)','rgba(148,163,184,0.85)']
              : ['rgba(37,99,235,0.85)','rgba(245,138,45,0.85)','rgba(34,197,94,0.85)','rgba(139,92,246,0.85)','rgba(236,72,153,0.85)','rgba(107,114,128,0.85)'],
            borderWidth: 0,
          }],
        }
      : null

  const topPostsChartData =
    d && d.topPosts.length > 0
      ? {
          labels: d.topPosts.map((p) => p.post_title || 'Removido'),
          datasets: [{
            label: 'Views',
            data: d.topPosts.map((p) => p.views),
            backgroundColor: isDark ? 'rgba(96,165,250,0.65)' : 'rgba(37,99,235,0.65)',
            hoverBackgroundColor: isDark ? 'rgba(96,165,250,0.85)' : 'rgba(37,99,235,0.85)',
            borderRadius: 4,
          }],
        }
      : null

  const tooltipStyle = {
    backgroundColor: chartColors.tooltip.bg,
    titleColor: chartColors.tooltip.title,
    bodyColor: chartColors.tooltip.body,
    borderColor: chartColors.tooltip.border,
    borderWidth: 1,
    padding: 10,
    cornerRadius: 8,
    titleFont: { size: 12 as number },
    bodyFont: { size: 12 as number },
  }

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: tooltipStyle,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 as number }, color: chartColors.tick, maxRotation: 45 },
        border: { display: false },
      },
      y: {
        grid: { color: chartColors.grid, drawTicks: false },
        ticks: { font: { size: 10 as number }, color: chartColors.tick, padding: 8 },
        border: { display: false },
        beginAtZero: true,
      },
    },
  }

  const lineOptions = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 as number }, boxWidth: 10, padding: 16, color: chartColors.legend },
      },
    },
  }

  const blogStatItems = [
    { label: 'Publicados', value: stats.published, color: isDark ? '#4ade80' : '#16a34a', dot: isDark ? '#4ade80' : '#16a34a' },
    { label: 'Rascunhos', value: stats.drafts, color: isDark ? '#fbbf24' : '#d97706', dot: isDark ? '#fbbf24' : '#d97706' },
    { label: 'Categorias', value: stats.categories, color: isDark ? '#60a5fa' : '#2563eb', dot: isDark ? '#60a5fa' : '#2563eb' },
    { label: 'Tags', value: stats.tags, color: isDark ? '#fb923c' : '#ea580c', dot: isDark ? '#fb923c' : '#ea580c' },
  ]

  const sourcesTotal = overview ? overview.sources.rssEnabled + overview.sources.crawlersEnabled : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm admin-text-secondary">Carregando dados…</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero / boas-vindas */}
      <div className="admin-card mb-6 px-6 py-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="admin-page-title">{greeting()}, Administrador 👋</h1>
          <p className="text-sm mt-1 admin-page-subtitle">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}
            {stats.published} {stats.published === 1 ? 'artigo publicado' : 'artigos publicados'}
            {overview?.automation.enabled && ' · automação ativa'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/artigos/novo" className="admin-btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Artigo
          </Link>
          <Link href="/admin/artigos?new=1" className="admin-quick-action">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
            </svg>
            Gerar com IA
          </Link>
          <Link href="/admin/configuracoes" className="admin-quick-action">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Configurações
          </Link>
          <div className="admin-period-toggle ml-1">
            {periods.map((p) => (
              <button key={p.value} onClick={() => setPeriod(p.value)} className={`admin-period-btn ${period === p.value ? 'active' : ''}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary metric cards (com sparkline) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard
          label="Views" value={d?.totalViews.toLocaleString('pt-BR') || '0'} sub="vs período anterior" badge={viewsChange}
          iconClass="admin-icon-blue" spark={sparkViews} sparkColor={chartColors.line1}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
        />
        <StatCard
          label="Únicos" value={d?.uniqueVisitors.toLocaleString('pt-BR') || '0'} sub="visitantes únicos" badge={visitorsChange}
          iconClass="admin-icon-purple" spark={sparkUnique} sparkColor={chartColors.line2}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard
          label="Hoje" value={d?.todayViews.toLocaleString('pt-BR') || '0'} sub="vs ontem" badge={todayChange}
          iconClass="admin-icon-green"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard
          label="Média/dia" value={d && d.totalViews > 0 ? (d.totalViews / d.days).toFixed(1) : '0'} sub="views por dia"
          iconClass="admin-icon-orange"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
        />
        <StatCard
          label="Online" value={String(d?.onlineNow || 0)} sub="últimos 5 min"
          iconClass="admin-icon-teal"
          icon={<span className="relative flex h-4 w-4 items-center justify-center"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-50"/><span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"/></span>}
        />
        <StatCard
          label="Pgs/Visitante" value={d && d.totalViews > 0 ? (d.totalViews / Math.max(d.uniqueVisitors, 1)).toFixed(1) : '0'} sub="profundidade"
          iconClass="admin-icon-gray"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
      </div>

      {/* Sistema — features que cresceram */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <SystemCard
            href="/admin/configuracoes" label="Automação" active={overview.automation.enabled}
            value={overview.automation.enabled ? 'Ligada' : 'Desligada'}
            hint={overview.automation.enabled ? `Próxima ${untilTime(overview.automation.next_run_at)}` : 'Toque para configurar'}
            tone="admin-icon-blue"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>}
          />
          <SystemCard
            href="/admin/newsletter" label="Newsletter"
            value={overview.newsletter.active.toLocaleString('pt-BR')}
            hint={overview.newsletter.active === 1 ? 'inscrito ativo' : 'inscritos ativos'}
            tone="admin-icon-purple"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
          />
          <SystemCard
            href="/admin/fontes" label="Fontes" active={sourcesTotal > 0}
            value={String(sourcesTotal)}
            hint={`${overview.sources.rssTotal} RSS · ${overview.sources.crawlersTotal} crawlers`}
            tone="admin-icon-green"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>}
          />
          <SystemCard
            href="/admin/api" label="API" active={overview.apiTokens.active > 0}
            value={String(overview.apiTokens.active)}
            hint={overview.apiTokens.active === 1 ? 'token ativo' : 'tokens ativos'}
            tone="admin-icon-orange"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>}
          />
        </div>
      )}

      {/* Blog content stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {blogStatItems.map((item) => (
          <div key={item.label} className="admin-card px-5 py-4 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide admin-text-secondary">{item.label}</p>
              <p className="text-2xl font-bold leading-tight" style={{ color: item.color }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Estado vazio — sem views ainda */}
      {!hasViews && (
        <div className="admin-card mb-6 px-6 py-10 text-center">
          <div className="mx-auto mb-4 admin-icon-blue inline-flex">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
          </div>
          <h2 className="text-base font-semibold admin-text-primary mb-1">
            {hasContent ? 'Ainda não há acessos registrados' : 'Seu blog está pronto para começar'}
          </h2>
          <p className="text-sm admin-text-secondary max-w-md mx-auto mb-5">
            {hasContent
              ? 'Os gráficos de audiência aparecem aqui assim que os primeiros visitantes chegarem. Compartilhe seus artigos para começar a medir.'
              : 'Publique seu primeiro artigo — escreva você mesmo ou deixe a IA gerar um rascunho a partir de um tema. As métricas começam a aparecer logo em seguida.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/admin/artigos/novo" className="admin-btn-primary">Escrever artigo</Link>
            <Link href="/admin/artigos?new=1" className="admin-quick-action">Gerar com IA</Link>
            {!overview?.automation.enabled && (
              <Link href="/admin/configuracoes" className="admin-quick-action">Ativar automação</Link>
            )}
          </div>
        </div>
      )}

      {/* Daily trend */}
      {hasViews && dailyChartData && (
        <SectionCard title="Tendência de acessos" className="mb-6">
          <div className="h-64">
            <Line data={dailyChartData} options={lineOptions} />
          </div>
        </SectionCard>
      )}

      {/* Hourly + Weekday */}
      {hasViews && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {hourlyChartData && (
            <SectionCard title="Acessos por hora">
              <div className="h-52"><Bar data={hourlyChartData} options={baseOptions} /></div>
            </SectionCard>
          )}
          {weekdayChartData && (
            <SectionCard title="Acessos por dia da semana">
              <div className="h-52"><Bar data={weekdayChartData} options={baseOptions} /></div>
            </SectionCard>
          )}
        </div>
      )}

      {/* Top posts + Page types + Traffic source */}
      {hasViews && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {topPostsChartData && (
            <div className="lg:col-span-2 admin-card overflow-hidden">
              <div className="admin-card-header">
                <h2 className="text-[13px] font-semibold">Artigos mais vistos</h2>
              </div>
              <div className="p-5 h-72">
                <Bar
                  data={topPostsChartData}
                  options={{
                    ...baseOptions,
                    indexAxis: 'y' as const,
                    plugins: {
                      ...baseOptions.plugins,
                      tooltip: {
                        ...tooltipStyle,
                        callbacks: {
                          title: (items) => d?.topPosts[items[0].dataIndex]?.post_title || 'Removido',
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {pageTypeChartData && (
              <div className="admin-card overflow-hidden flex-1">
                <div className="admin-card-header">
                  <h2 className="text-[13px] font-semibold">Tipos de página</h2>
                </div>
                <div className="p-5 h-44">
                  <Doughnut
                    data={pageTypeChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '65%',
                      plugins: {
                        legend: {
                          position: 'right' as const,
                          labels: { font: { size: 11 as number }, boxWidth: 10, padding: 8, color: chartColors.legend },
                        },
                        tooltip: tooltipStyle,
                      },
                    }}
                  />
                </div>
              </div>
            )}

            {d && d.referrers.length > 0 && (
              <div className="admin-card overflow-hidden flex-1">
                <div className="admin-card-header">
                  <h2 className="text-[13px] font-semibold">Origem do tráfego</h2>
                </div>
                <div className="p-5 space-y-3">
                  {d.referrers.slice(0, 6).map((r, idx) => {
                    const total = d.referrers.reduce((a, b) => a + b.views, 0) || 1
                    const pct = Math.round((r.views / total) * 100)
                    return (
                      <div key={'ref-' + idx} className="flex items-center gap-3">
                        <span className="text-[12px] admin-text-secondary w-24 truncate shrink-0" title={r.referrer}>
                          {r.referrer}
                        </span>
                        <div className="flex-1 admin-progress-bg rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full admin-progress-fill transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] admin-text-secondary w-8 text-right shrink-0">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Atividade recente da automação */}
      {overview && overview.recentActivity.length > 0 && (
        <SectionCard
          title="Atividade recente"
          className="mb-6"
          action={
            <Link href="/admin/configuracoes" className="text-[12px] font-medium" style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>
              Ver tudo
            </Link>
          }
        >
          <div className="divide-y" style={{ borderColor: 'var(--at-card-divider)' }}>
            {overview.recentActivity.map((log) => {
              const tone = STATUS_TONE[log.status] || { dot: '#94a3b8', label: log.status }
              return (
                <div key={log.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: tone.dot }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] admin-text-primary truncate">
                      {log.message || tone.label}
                    </p>
                    <p className="text-[11px] admin-text-secondary">
                      {tone.label} · {log.triggered_by === 'manual' ? 'manual' : 'agendado'}
                    </p>
                  </div>
                  <span className="text-[11px] admin-text-secondary shrink-0">{relativeTime(log.started_at)}</span>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      <div className="flex justify-center pb-4">
        <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: isDark ? '#60a5fa' : '#2563eb' }}>
          Ver analytics completo
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </Link>
      </div>
    </div>
  )
}
