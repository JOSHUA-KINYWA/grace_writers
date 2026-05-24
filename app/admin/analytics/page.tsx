'use client'

import { useState, useEffect } from 'react'
import { FaDownload } from 'react-icons/fa'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('month')
  const [metrics, setMetrics] = useState([
    { label: 'Orders Completed', value: 0, change: '0%', icon: '📦' },
    { label: 'Total Revenue', value: '$0', change: '0%', icon: '💰' },
    { label: 'Avg. Order Value', value: '$0', change: '0%', icon: '📊' },
    { label: 'Client Satisfaction', value: '0/5', change: '0%', icon: '⭐' },
  ])
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    // TODO: Fetch analytics data from API
    // const fetchAnalytics = async () => {
    //   const response = await fetch(`/api/admin/analytics?range=${timeRange}`)
    //   const data = await response.json()
    //   setMetrics(data.metrics)
    //   setChartData(data.chartData)
    // }
    // fetchAnalytics()
  }, [timeRange])

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Analytics & Reports</h2>
          <p className="text-gray-600">Track your business performance</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FaDownload /> Export Report
        </button>
      </div>

      {/* Time Range Filter */}
      <div className="mb-6 flex gap-2">
        {['week', 'month', 'year'].map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg transition ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{metric.icon}</span>
              <span className="text-green-600 text-sm font-semibold">{metric.change}</span>
            </div>
            <p className="text-gray-600 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Orders Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Trend</h3>
          <div className="space-y-3">
            {chartData.map((data: any, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{data.month}</span>
                <div className="flex items-center gap-2 flex-1 ml-4">
                  <div className="w-32 bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(data.orders / 30) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">{data.orders}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="space-y-3">
            {chartData.map((data: any, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{data.month}</span>
                <div className="flex items-center gap-2 flex-1 ml-4">
                  <div className="w-32 bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${(data.revenue / 10000) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold">${data.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-4 border-blue-600 pl-4 py-2">
            <p className="text-gray-600 text-sm">Best Performing Service</p>
            <p className="text-lg font-semibold text-gray-900">Web Design</p>
            <p className="text-xs text-gray-500">42 orders this month</p>
          </div>
          <div className="border-l-4 border-green-600 pl-4 py-2">
            <p className="text-gray-600 text-sm">Peak Order Day</p>
            <p className="text-lg font-semibold text-gray-900">Fridays</p>
            <p className="text-xs text-gray-500">28% of weekly orders</p>
          </div>
          <div className="border-l-4 border-purple-600 pl-4 py-2">
            <p className="text-gray-600 text-sm">Avg Completion Time</p>
            <p className="text-lg font-semibold text-gray-900">4.2 days</p>
            <p className="text-xs text-gray-500">↓ 0.5 days vs last month</p>
          </div>
        </div>
      </div>
    </div>
  )
}
