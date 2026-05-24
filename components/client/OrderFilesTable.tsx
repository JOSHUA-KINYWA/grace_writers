'use client'

import { FaFile } from 'react-icons/fa'

export type OrderFileLink = {
  href: string
  name: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

type OrderFilesTableProps = {
  attached: OrderFileLink[]
  uploaded: OrderFileLink[]
  revision: OrderFileLink[]
}

function FileCell({ file }: { file?: OrderFileLink }) {
  if (!file) {
    return <span className="text-slate-400 text-sm">—</span>
  }
  return (
    <a
      href={file.href}
      target="_blank"
      rel="noopener noreferrer"
      download={!file.onClick}
      onClick={file.onClick}
      className="flex items-start gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm min-w-0 group"
      title={file.name}
    >
      <FaFile size={14} className="shrink-0 mt-0.5" />
      <span className="truncate break-all">{file.name}</span>
    </a>
  )
}

export default function OrderFilesTable({ attached, uploaded, revision }: OrderFilesTableProps) {
  const rowCount = Math.max(attached.length, uploaded.length, revision.length, 0)
  if (rowCount === 0) return null

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="w-1/3 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
              Attached Files
            </th>
            <th className="w-1/3 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
              Uploaded Files
            </th>
            <th className="w-1/3 px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
              Revision Files
            </th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }, (_, i) => (
            <tr key={i} className="border-b border-slate-100 align-top hover:bg-slate-50/80">
              <td className="px-3 py-3 min-w-0 border-r border-slate-100">
                <FileCell file={attached[i]} />
              </td>
              <td className="px-3 py-3 min-w-0 border-r border-slate-100">
                <FileCell file={uploaded[i]} />
              </td>
              <td className="px-3 py-3 min-w-0">
                <FileCell file={revision[i]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
