import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Fetch a single testimonial or all testimonials
export async function GET(req: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  try {
    if (id) {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return NextResponse.json(data)
    } else {
      const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return NextResponse.json(data)
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}

// POST - Create a new testimonial
export async function POST(req: Request) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    const {
      client_name,
      company,
      comment,
      rating,
      approved = false,
      featured = false
    } = body

    // Validate required fields
    if (!client_name || !comment || !rating) {
      return NextResponse.json(
        { error: 'Missing required fields: client_name, comment, rating' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert([
        {
          client_name,
          company,
          comment,
          rating,
          approved,
          featured,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create testimonial' },
      { status: 500 }
    )
  }
}

// PUT - Update a testimonial
export async function PUT(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is admin
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing testimonial ID' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('testimonials')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update testimonial' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a testimonial
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is admin
  if (!user || user.user_metadata?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing testimonial ID' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Testimonial deleted successfully' })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete testimonial' },
      { status: 500 }
    )
  }
}
