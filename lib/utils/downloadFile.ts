export default async function downloadFile(filePath: string, fileName?: string) {
  try {
    const res = await fetch('/api/signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data?.error || `Failed to get signed URL (${res.status})`)
    }

    const { signedUrl } = await res.json()
    if (!signedUrl) throw new Error('Signed URL not returned')

    // Fetch the actual file content from the signed URL
    const fileRes = await fetch(signedUrl)
    if (!fileRes.ok) throw new Error(`Failed to download file (${fileRes.status})`)

    const blob = await fileRes.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName || filePath.split('/').pop() || 'download'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err: any) {
    alert(`Download failed: ${err?.message || err}`)
    console.error('downloadFile error:', err)
  }
}
