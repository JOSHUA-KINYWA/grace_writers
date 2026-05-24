/** Resolve storage path or URL to a displayable avatar URL. */
export async function resolveStorageImageUrl(
  supabase: { storage: { from: (b: string) => { createSignedUrl: (p: string, s: number) => Promise<{ data: { signedUrl?: string } | null }> } } },
  path: string | null | undefined,
  expiresIn = 60 * 60
): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  try {
    const { data } = await supabase.storage.from('order-files').createSignedUrl(path, expiresIn)
    return data?.signedUrl || null
  } catch {
    return null
  }
}
