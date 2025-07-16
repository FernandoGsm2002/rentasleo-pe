import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente admin con service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { nombre, username, password, sueldo_base, action, id } = await request.json()
    const email = `${username}@leope.com`

    if (action === 'create') {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      })

      if (authError) {
        console.error('Error creando auth:', authError)
        return NextResponse.json({ error: 'Error creando usuario en auth' }, { status: 400 })
      }

      // 2. Crear registro en tabla usuarios
      const { error: dbError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: authData.user.id,
          email: email,
          nombre: nombre,
          rol: 'trabajador',
          activo: true,
          sueldo_base: sueldo_base || 0
        })

      if (dbError) {
        console.error('Error creando en BD:', dbError)
        // Si falla la BD, eliminar el usuario de auth
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: 'Error creando usuario en base de datos' }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        message: `Trabajador ${nombre} creado exitosamente`,
        user: authData.user 
      })

    } else if (action === 'update') {
      // Actualizar trabajador existente
      const { error: dbError } = await supabaseAdmin
        .from('usuarios')
        .update({
          nombre: nombre,
          email: email,
          sueldo_base: sueldo_base || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (dbError) {
        console.error('Error actualizando BD:', dbError)
        return NextResponse.json({ error: 'Error actualizando usuario' }, { status: 400 })
      }

      // Si hay nueva contraseña, actualizar en auth
      if (password) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
          id,
          { 
            email: email,
            password: password 
          }
        )
        if (authError) {
          console.error('Error actualizando auth:', authError)
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `Trabajador ${nombre} actualizado exitosamente` 
      })

    } else if (action === 'delete') {
      // Eliminar trabajador
      // 1. Eliminar de Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
      if (authError) {
        console.error('Error eliminando auth:', authError)
      }

      // 2. Eliminar de tabla usuarios
      const { error: dbError } = await supabaseAdmin
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (dbError) {
        console.error('Error eliminando BD:', dbError)
        return NextResponse.json({ error: 'Error eliminando usuario' }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Trabajador eliminado exitosamente' 
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })

  } catch (error) {
    console.error('Error en API trabajadores:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 