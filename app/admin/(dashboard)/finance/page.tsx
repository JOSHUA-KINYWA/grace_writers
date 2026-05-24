'use client'

import { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa'

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('invoices')
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [financialMetrics, setFinancialMetrics] = useState({
    totalRevenue: '$0',
    pendingInvoices: '$0',
    totalExpenses: '$0',
    netProfit: '$0',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch finance data from API
    // const fetchFinanceData = async () => {
    //   try {
    //     const response = await fetch('/api/admin/finance')
    //     const data = await response.json()
    //     setInvoices(data.invoices)
    //     setExpenses(data.expenses)
    //     setFinancialMetrics(data.metrics)
    //   } catch (error) {
    //     console.error('Failed to fetch finance data:', error)
    //   } finally {
    //     setLoading(false)
    //   }
    // }
    // fetchFinanceData()
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Finance & Invoicing</h2>
          <p className="text-gray-600">Manage revenue and expenses</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FaPlus /> New Invoice
        </button>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-green-600">{financialMetrics.totalRevenue}</p>
          <p className="text-xs text-gray-500 mt-2">From all invoices</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Pending Invoices</p>
          <p className="text-3xl font-bold text-orange-600">{financialMetrics.pendingInvoices}</p>
          <p className="text-xs text-gray-500 mt-2">Awaiting payment</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600">{financialMetrics.totalExpenses}</p>
          <p className="text-xs text-gray-500 mt-2">All expenses</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Net Profit</p>
          <p className="text-3xl font-bold text-blue-600">{financialMetrics.netProfit}</p>
          <p className="text-xs text-gray-500 mt-2">Revenue - Expenses</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-4">
        {[
          { id: 'invoices', label: 'Invoices' },
          { id: 'expenses', label: 'Expenses' },
          { id: 'payments', label: 'Payments' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No invoices found</div>
          ) : (
            <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Invoice ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Client</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
            {invoices.map((invoice: any) => (
                <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{invoice.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.client}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{invoice.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{invoice.date}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button className="text-blue-600 hover:text-blue-900 p-2">
                      <FaEye size={16} />
                    </button>
                    <button className="text-green-600 hover:text-green-900 p-2">
                      <FaEdit size={16} />
                    </button>
                    <button className="text-red-600 hover:text-red-900 p-2">
                      <FaTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          )}
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Description</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
            {expenses.map((expense: any) => (
                <tr key={expense.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{expense.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{expense.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">{expense.amount}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{expense.date}</td>
                  <td className="px-6 py-4 text-sm flex gap-2">
                    <button className="text-green-600 hover:text-green-900 p-2">
                      <FaEdit size={16} />
                    </button>
                    <button className="text-red-600 hover:text-red-900 p-2">
                      <FaTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
