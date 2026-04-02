import { createClient } from '../supabase/server'
import { Database } from '../types/database'

type Service = Database['public']['Tables']['services']['Row']
type PortfolioItem = Database['public']['Tables']['portfolio_items']['Row']
type Testimonial = Database['public']['Tables']['testimonials']['Row']
type SiteSettings = Database['public']['Tables']['site_settings']['Row']

// Service helpers
export async function getServices() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Service[]
}

export async function getServiceBySlug(slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error) throw error
  return data as Service
}

export async function getPricingTiers(serviceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('service_id', serviceId)
    .order('price', { ascending: true })

  if (error) throw error
  return data
}

// Portfolio helpers
export async function getPortfolioItems(featured?: boolean) {
  const supabase = await createClient()
  let query = supabase
    .from('portfolio_items')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (featured !== undefined) {
    query = query.eq('featured', featured)
  }

  const { data, error } = await query

  if (error) throw error
  return data as PortfolioItem[]
}

export async function getPortfolioByService(serviceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('service_id', serviceId)
    .order('display_order', { ascending: true })

  if (error) throw error
  return data as PortfolioItem[]
}

// Testimonial helpers
export async function getTestimonials(featured?: boolean) {
  const supabase = await createClient()
  let query = supabase
    .from('testimonials')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false })

  if (featured !== undefined) {
    query = query.eq('featured', featured)
  }

  const { data, error } = await query

  if (error) throw error
  return data as Testimonial[]
}

// Site settings helpers
export async function getSiteSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .limit(1)
    .single()

  if (error) throw error
  return data as SiteSettings
}

// WhatsApp helper
export function generateWhatsAppLink(phone: string, message: string): string {
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`
}

export function generateServiceWhatsAppMessage(serviceTitle: string): string {
  return `Hi, I'm interested in your ${serviceTitle} service. I'd like to get a quote.`
}
