import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente admin con service role key para operaciones confiables
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
    const { action, id, ...data } = await request.json()
    
    console.log('🚀 [API] Acción:', action, 'ID:', id)

    switch (action) {
      case 'start_rent':
        const { duracion_horas, fecha_inicio, fecha_fin, usuario_responsable_id } = data
        
        console.log('📝 [API] Iniciando renta:', { id, duracion_horas, fecha_inicio, fecha_fin })
        
        const { data: rentData, error: rentError } = await supabaseAdmin
          .from('rentas_herramientas')
          .update({
            duracion_horas,
            fecha_inicio,
            fecha_fin,
            usuario_responsable_id: usuario_responsable_id || null,
            activa: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()

        if (rentError) {
          console.error('❌ [API] Error en start_rent:', rentError)
          return NextResponse.json({ 
            error: 'Error iniciando renta',
            details: rentError.message 
          }, { status: 400 })
        }

        console.log('✅ [API] Renta iniciada exitosamente:', rentData)
        return NextResponse.json({ 
          success: true, 
          message: 'Renta iniciada exitosamente',
          data: rentData 
        })

      case 'stop_rent':
        console.log('🛑 [API] Deteniendo renta:', id)
        
        const { data: stopData, error: stopError } = await supabaseAdmin
          .from('rentas_herramientas')
          .update({
            activa: false,
            fecha_inicio: new Date().toISOString(),
            fecha_fin: new Date().toISOString(),
            duracion_horas: 0,
            usuario_responsable_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()

        if (stopError) {
          console.error('❌ [API] Error en stop_rent:', stopError)
          return NextResponse.json({ 
            error: 'Error deteniendo renta',
            details: stopError.message 
          }, { status: 400 })
        }

        console.log('✅ [API] Renta detenida exitosamente:', stopData)
        return NextResponse.json({ 
          success: true, 
          message: 'Renta detenida exitosamente',
          data: stopData 
        })

      case 'create_license':
        const { nombre_herramienta, tipo_herramienta, usuario_login, password_actual } = data
        
        console.log('➕ [API] Creando licencia:', { nombre_herramienta, tipo_herramienta })
        
        const { data: createData, error: createError } = await supabaseAdmin
          .from('rentas_herramientas')
          .insert({
            nombre_herramienta,
            tipo_herramienta,
            usuario_login,
            password_actual,
            duracion_horas: 0,
            fecha_inicio: new Date().toISOString(),
            fecha_fin: new Date().toISOString(),
            usuario_responsable_id: null,
            activa: false,
            costo: 0
          })
          .select()

        if (createError) {
          console.error('❌ [API] Error en create_license:', createError)
          return NextResponse.json({ 
            error: 'Error creando licencia',
            details: createError.message 
          }, { status: 400 })
        }

        console.log('✅ [API] Licencia creada exitosamente:', createData)
        return NextResponse.json({ 
          success: true, 
          message: 'Licencia creada exitosamente',
          data: createData 
        })

      case 'update_license':
        console.log('✏️ [API] Actualizando licencia:', id)
        
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('rentas_herramientas')
          .update({
            nombre_herramienta: data.nombre_herramienta,
            tipo_herramienta: data.tipo_herramienta,
            usuario_login: data.usuario_login,
            password_actual: data.password_actual,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()

        if (updateError) {
          console.error('❌ [API] Error en update_license:', updateError)
          return NextResponse.json({ 
            error: 'Error actualizando licencia',
            details: updateError.message 
          }, { status: 400 })
        }

        console.log('✅ [API] Licencia actualizada exitosamente:', updateData)
        return NextResponse.json({ 
          success: true, 
          message: 'Licencia actualizada exitosamente',
          data: updateData 
        })

      case 'delete_license':
        console.log('🗑️ [API] Eliminando licencia:', id)
        
        const { error: deleteError } = await supabaseAdmin
          .from('rentas_herramientas')
          .delete()
          .eq('id', id)

        if (deleteError) {
          console.error('❌ [API] Error en delete_license:', deleteError)
          return NextResponse.json({ 
            error: 'Error eliminando licencia',
            details: deleteError.message 
          }, { status: 400 })
        }

        console.log('✅ [API] Licencia eliminada exitosamente')
        return NextResponse.json({ 
          success: true, 
          message: 'Licencia eliminada exitosamente' 
        })

      default:
        return NextResponse.json({ 
          error: 'Acción no válida' 
        }, { status: 400 })
    }

  } catch (error: any) {
    console.error('❌ [API] Error general:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 })
  }
} 