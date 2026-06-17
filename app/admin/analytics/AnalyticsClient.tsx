'use client'

import { useEffect, useState, useCallback } from 'react'
import { usePageTitle } from '@/components/admin/AdminPageTitleContext'
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

export default function AnalyticsPage() {
  usePageTitle('Analytics')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30d')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/analytics?period=${period}`)
      if (res.ok) setData(await res.json())
    } catch (e) {
      console.error('Failed to fetch analytics:', e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const periods = [
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: '365d', label: '12 meses' },
  ]

  const d = data

  const dailyChartData = d
    ? {
        labels: d.viewsByDay.map((v) =>
          new Date(v.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        ),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByDay.map((v) => v.views),
            borderColor: 'rgba(26, 79, 160, 1)',
            backgroundColor: 'rgba(26, 79, 160, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 6,
          },
          {
            label: 'Unicos',
            data: d.viewsByDay.map((v) => v.unique),
            borderColor: 'rgba(139, 92, 246, 1)',
            backgroundColor: 'rgba(139, 92, 246, 0.05)',
            fill: true,
            tension: 0.4,
            pointRadius: d.viewsByDay.length > 60 ? 0 : 3,
            pointHoverRadius: 6,
          },
        ],
      }
    : null

  const hourlyChartData = d
    ? {
        labels: d.viewsByHour.map((h) => `${h.hour}h`),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByHour.map((h) => h.views),
            backgroundColor: d.viewsByHour.map((h) => {
              const max = Math.max(...d.viewsByHour.map((x) => x.views))
              if (h.views === max && max > 0) return 'rgba(245, 138, 45, 0.9)'
              if (h.views === 0) return 'rgba(26, 79, 160, 0.2)'
              return 'rgba(26, 79, 160, 0.7)'
            }),
            borderRadius: 4,
          },
        ],
      }
    : null

  const weekdayChartData = d
    ? {
        labels: d.viewsByWeekday.map((w) => w.weekday),
        datasets: [
          {
            label: 'Views',
            data: d.viewsByWeekday.map((w) => w.views),
            backgroundColor: d.viewsByWeekday.map((w) => {
              const max = Math.max(...d.viewsByWeekday.map((x) => x.views))
              if (w.views === max && max > 0) return 'rgba(245, 138, 45, 0.9)'
              return 'rgba(26, 79, 160, 0.7)'
            }),
            borderRadius: 4,
          },
        ],
      }
    : null

  const topPostsChartData = d && d.topPosts.length > 0
    ? {
        labels: d.topPosts.map((p) => {
          const t = p.post_title || 'Removido'
          return t.length > 40 ? t.slice(0, 40) + '...' : t
        }),
        datasets: [
          {
            label: 'Views',
            data: d.topPosts.map((p) => p.views),
            backgroundColor: [
              'rgba(26, 79, 160, 0.85)',
              'rgba(26, 79, 160, 0.7)',
              'rgba(26, 79, 160, 0.6)',
              'rgba(26, 79, 160, 0.5)',
              'rgba(26, 79, 160, 0.4)',
              'rgba(26, 79, 160, 0.35)',
              'rgba(26, 79, 160, 0.3)',
              'rgba(26, 79, 160, 0.25)',
              'rgba(26, 79, 160, 0.2)',
              'rgba(26, 79, 160, 0.15)',
            ],
            borderRadius: 4,
          },
        ],
      }
    : null

  const pageTypeChartData = d && d.pageTypes.length > 0
    ? {
        labels: d.pageTypes.map((p) => p.type),
        datasets: [
          {
            data: d.pageTypes.map((p) => p.views),
            backgroundColor: [
              'rgba(26, 79, 160, 0.85)',
              'rgba(245, 138, 45, 0.85)',
              'rgba(34, 197, 94, 0.85)',
              'rgba(139, 92, 246, 0.85)',
              'rgba(236, 72, 153, 0.85)',
              'rgba(107, 114, 128, 0.85)',
            ],
            borderWidth: 0,
          },
        ],
      }
    : null

  const chartOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        titleFont: { size: 12 },
        bodyFont: { size: 12 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 45 },
      },
      y: {
        grid: { color: 'rgba(0,0,0,0.05)' },
        ticks: { font: { size: 10 }, color: '#9ca3af' },
        beginAtZero: true,
      },
    },
  }

  const lineOpts = {
    ...chartOpts,
    plugins: {
      ...chartOpts.plugins,
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 }, boxWidth: 12, padding: 16 },
      },
    },
  }

  const totalPageTypes = d?.pageTypes.reduce((a, b) => a + b.views, 0) || 1

  return (
    <div>
      <div className="flex items-center justify-end mb-8">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary" />
        </div>
      )}

      {!loading && d && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="rounded-xl p-5 bg-blue-50 border border-blue-100">
              <p className="text-3xl font-bold text-blue-600">{d.totalViews.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-gray-600 mt-1">Visualizacoes</p>
            </div>
            <div className="rounded-xl p-5 bg-purple-50 border border-purple-100">
              <p className="text-3xl font-bold text-purple-600">{d.uniqueVisitors.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-gray-600 mt-1">Visitantes unicos</p>
            </div>
            <div className="rounded-xl p-5 bg-green-50 border border-green-100">
              <p className="text-3xl font-bold text-green-600">
                {d.totalViews > 0 ? (d.totalViews / Math.max(d.uniqueVisitors, 1)).toFixed(1) : '0'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Paginas/visitante</p>
            </div>
            <div className="rounded-xl p-5 bg-orange-50 border border-orange-100">
              <p className="text-3xl font-bold text-orange-600">
                {d.totalViews > 0 ? (d.totalViews / d.days).toFixed(1) : '0'}
              </p>
              <p className="text-sm text-gray-600 mt-1">Media diaria</p>
            </div>
          </div>

          {dailyChartData && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tendencia diaria</h2>
              <div className="h-72">
                <Line data={dailyChartData} options={lineOpts} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {hourlyChartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Acessos por hora do dia</h2>
                <div className="h-64">
                  <Bar data={hourlyChartData} options={chartOpts} />
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {d.viewsByHour
                    .filter((h) => h.views > 0)
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 5)
                    .map((h) => (
                      <span key={h.hour} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-medium">
                        {h.label}: {h.views}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {weekdayChartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Acessos por dia da semana</h2>
                <div className="h-64">
                  <Bar data={weekdayChartData} options={chartOpts} />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {topPostsChartData && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">Artigos mais vistos</h2>
                <div className="h-80">
                  <Bar
                    data={topPostsChartData}
                    options={{
                      ...chartOpts,
                      indexAxis: 'y' as const,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-6">
              {pageTypeChartData && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Tipos de pagina</h2>
                  <div className="h-48">
                    <Doughnut
                      data={pageTypeChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '65%',
                        plugins: {
                          legend: {
                            position: 'right' as const,
                            labels: { font: { size: 11 }, boxWidth: 10, padding: 8 },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {d.referrers.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6 flex-1">
                  <h2 className="text-lg font-semibold text-neutral-900 mb-4">Origem do trafego</h2>
                  <div className="space-y-3">
                    {d.referrers.slice(0, 8).map((r, idx) => {
                      const pct = ((r.views / totalPageTypes) * 100).toFixed(0)
                      return (
                        <div key={'ref-' + idx}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 truncate mr-2" title={r.referrer}>
                              {r.referrer}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">{r.views} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-brand-primary/70 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {d.viewsByDay.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Resumo por dia</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium text-gray-500">Data</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">Views</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">Unicos</th>
                      <th className="text-right py-2 px-3 font-medium text-gray-500">Views/Unicos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.viewsByDay
                      .slice()
                      .reverse()
                      .slice(0, 30)
                      .map((day) => (
                        <tr key={day.date} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-3">
                            {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                              weekday: 'short',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </td>
                          <td className="py-2 px-3 text-right font-medium">{day.views}</td>
                          <td className="py-2 px-3 text-right text-gray-500">{day.unique}</td>
                          <td className="py-2 px-3 text-right text-gray-500">
                            {day.unique > 0 ? (day.views / day.unique).toFixed(1) : '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !data && (
        <div className="text-center py-20 text-gray-400">
          Nao foi possivel carregar os dados de analytics.
        </div>
      )}
    </div>
  )
}
