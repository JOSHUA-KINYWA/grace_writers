'use server'

import { createClient } from '@/lib/supabase/server'

export async function getSignedFileUrl(filePath: string) {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.storage
      .from('order-files')
      .createSignedUrl(filePath, 3600) // 1 hour expiry

    if (error) throw error
    
    return { url: data.signedUrl, error: null }
  } catch (error: any) {
    return { url: null, error: error.message }
  }
}

export async function getSignedFileUrls(filePaths: string[]) {
  const supabase = await createClient()
  
  try {
    const signedUrls = await Promise.all(
      filePaths.map(async (path) => {
        const { data, error } = await supabase.storage
          .from('order-files')
          .createSignedUrl(path, 3600)
        
        if (error) throw error
        return data.signedUrl
      })
    )
    
    return { urls: signedUrls, error: null }
  } catch (error: any) {
    return { urls: null, error: error.message }
  }
}
