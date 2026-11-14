import EmailHealthPanel from '@/components/admin/EmailHealthPanel'
import DeleteOldFilesPanel from '@/components/admin/DeleteOldFilesPanel'

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
        <p className="text-gray-600">
          Check email delivery and manage stored order files.
        </p>
      </div>

      <EmailHealthPanel />

      <section className="mt-8">
        <DeleteOldFilesPanel />
      </section>
    </div>
  )
}
