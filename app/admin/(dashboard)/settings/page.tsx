'use client'

import { useState, useEffect } from 'react'
import { FaSave, FaToggleOn, FaToggleOff } from 'react-icons/fa'
import EmailHealthPanel from '@/components/admin/EmailHealthPanel'

type Settings = {
  businessName: string
  email: string
  phone: string
  description: string
  emailNotifications: boolean
  twoFactor: boolean
  apiEnabled: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    businessName: '',
    email: '',
    phone: '',
    description: '',
    emailNotifications: false,
    twoFactor: false,
    apiEnabled: false,
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Fetch settings from API
    // const fetchSettings = async () => {
    //   try {
    //     const response = await fetch('/api/admin/settings')
    //     const data = await response.json()
    //     setSettings(data)
    //   } catch (error) {
    //     console.error('Failed to fetch settings:', error)
    //   } finally {
    //     setLoading(false)
    //   }
    // }
    // fetchSettings()
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: Save settings to API
      // const response = await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // })
      // if (response.ok) {
      //   alert('Settings saved successfully')
      // }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (key: 'emailNotifications' | 'twoFactor' | 'apiEnabled') => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleInputChange = (key: 'businessName' | 'email' | 'phone' | 'description', value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-600">Configure your application settings</p>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading settings...</div>
      ) : (
      <>
      {/* Business Information */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
            <input
              type="text"
              value={settings.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
            <input
              type="tel"
              value={settings.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
            <textarea
              value={settings.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
        </div>
      </div>

      <EmailHealthPanel />

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-600">Add an extra layer of security</p>
            </div>
            <button
              onClick={() => handleToggle('twoFactor')}
              className="text-2xl"
            >
              {settings.twoFactor ? (
                <FaToggleOn className="text-green-600" />
              ) : (
                <FaToggleOff className="text-gray-400" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-600">Receive important notifications via email</p>
            </div>
            <button
              onClick={() => handleToggle('emailNotifications')}
              className="text-2xl"
            >
              {settings.emailNotifications ? (
                <FaToggleOn className="text-green-600" />
              ) : (
                <FaToggleOff className="text-gray-400" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">API Access</p>
              <p className="text-sm text-gray-600">Enable API for integrations</p>
            </div>
            <button
              onClick={() => handleToggle('apiEnabled')}
              className="text-2xl"
            >
              {settings.apiEnabled ? (
                <FaToggleOn className="text-green-600" />
              ) : (
                <FaToggleOff className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Notification Templates</h3>
        <div className="space-y-4">
          {['New Order', 'Order Completed', 'Client Message', 'Payment Received'].map((template, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{template}</p>
                  <p className="text-sm text-gray-600">Customize email template</p>
                </div>
                <button className="text-blue-600 hover:text-blue-900 text-sm">Edit</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">API Keys</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">Public Key</p>
                <p className="text-sm text-gray-600 break-all">sk_live_4eC39HqLyjWDarhtT</p>
              </div>
              <button className="text-blue-600 hover:text-blue-900 text-sm">Copy</button>
            </div>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">Secret Key</p>
                <p className="text-sm text-gray-600">••••••••••••••••••••</p>
              </div>
              <button className="text-blue-600 hover:text-blue-900 text-sm">Show</button>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
        >
          <FaSave /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      </>
      )}
    </div>
  )
}
