export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nombre: string
          rol: 'creador' | 'trabajador'
          activo: boolean
          sueldo_base: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          nombre: string
          rol: 'creador' | 'trabajador'
          activo?: boolean
          sueldo_base?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          nombre?: string
          rol?: 'creador' | 'trabajador'
          activo?: boolean
          sueldo_base?: number
          created_at?: string
          updated_at?: string
        }
      }
      ingresos: {
        Row: {
          id: string
          usuario_id: string
          fecha_ingreso: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          fecha_ingreso?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          fecha_ingreso?: string
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      dias_trabajados: {
        Row: {
          id: string
          usuario_id: string
          fecha: string
          horas_trabajadas: number
          monto_asignado: number
          pagado: boolean
          fecha_pago: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          fecha: string
          horas_trabajadas?: number
          monto_asignado?: number
          pagado?: boolean
          fecha_pago?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          fecha?: string
          horas_trabajadas?: number
          monto_asignado?: number
          pagado?: boolean
          fecha_pago?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      rentas_herramientas: {
        Row: {
          id: string
          nombre_herramienta: string
          tipo_herramienta: string
          usuario_login: string
          password_actual: string
          duracion_horas: number
          fecha_inicio: string
          fecha_fin: string
          activa: boolean
          costo: number
          usuario_responsable_id: string | null
          notificacion_enviada: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre_herramienta: string
          tipo_herramienta: string
          usuario_login: string
          password_actual: string
          duracion_horas: number
          fecha_inicio: string
          fecha_fin: string
          activa?: boolean
          costo: number
          usuario_responsable_id?: string | null
          notificacion_enviada?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre_herramienta?: string
          tipo_herramienta?: string
          usuario_login?: string
          password_actual?: string
          duracion_horas?: number
          fecha_inicio?: string
          fecha_fin?: string
          activa?: boolean
          costo?: number
          usuario_responsable_id?: string | null
          notificacion_enviada?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      imei_justificado: {
        Row: {
          id: string
          imei: string
          modelo_descripcion: string
          modelo_nombre: string
          modelo_mercado: string | null
          codigo_modelo: string | null
          memoria: string | null
          serial: string | null
          estado_osiptel: 'apto' | 'no_apto' | 'pendiente' | null
          fecha_verificacion: string | null
          monto_cobrado: number
          usuario_procesado_id: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          imei: string
          modelo_descripcion: string
          modelo_nombre: string
          modelo_mercado?: string | null
          codigo_modelo?: string | null
          memoria?: string | null
          serial?: string | null
          estado_osiptel?: 'apto' | 'no_apto' | 'pendiente' | null
          fecha_verificacion?: string | null
          monto_cobrado?: number
          usuario_procesado_id?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          imei?: string
          modelo_descripcion?: string
          modelo_nombre?: string
          modelo_mercado?: string | null
          codigo_modelo?: string | null
          memoria?: string | null
          serial?: string | null
          estado_osiptel?: 'apto' | 'no_apto' | 'pendiente' | null
          fecha_verificacion?: string | null
          monto_cobrado?: number
          usuario_procesado_id?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bugs_samsung: {
        Row: {
          id: string
          usuario_id: string
          fecha: string
          cantidad_bugs: number
          precio_por_bug: number
          total_ganado: number
          descripcion: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          fecha: string
          cantidad_bugs?: number
          precio_por_bug?: number
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          fecha?: string
          cantidad_bugs?: number
          precio_por_bug?: number
          descripcion?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      marcado_horarios: {
        Row: {
          id: string
          usuario_id: string
          fecha: string
          hora_entrada: string | null
          hora_salida: string | null
          total_horas: number
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          fecha: string
          hora_entrada?: string | null
          hora_salida?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          fecha?: string
          hora_entrada?: string | null
          hora_salida?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_ingresos_por_usuario: {
        Args: {
          usuario_uuid: string
          fecha_inicio: string
          fecha_fin: string
        }
        Returns: {
          fecha: string
          total_ingresos: number
        }[]
      }
      get_resumen_trabajador: {
        Args: {
          usuario_uuid: string
        }
        Returns: {
          total_dias_trabajados: number
          total_monto_pendiente: number
          total_monto_pagado: number
          bugs_mes_actual: number
          ganancia_bugs_mes: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Tipos auxiliares
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type UsuarioInsert = Database['public']['Tables']['usuarios']['Insert']
export type UsuarioUpdate = Database['public']['Tables']['usuarios']['Update']

export type Ingreso = Database['public']['Tables']['ingresos']['Row']
export type IngresoInsert = Database['public']['Tables']['ingresos']['Insert']

export type DiaTrabajado = Database['public']['Tables']['dias_trabajados']['Row']
export type DiaTrabajadoInsert = Database['public']['Tables']['dias_trabajados']['Insert']
export type DiaTrabajadoUpdate = Database['public']['Tables']['dias_trabajados']['Update']

export type RentaHerramienta = Database['public']['Tables']['rentas_herramientas']['Row']
export type RentaHerramientaInsert = Database['public']['Tables']['rentas_herramientas']['Insert']
export type RentaHerramientaUpdate = Database['public']['Tables']['rentas_herramientas']['Update']

export type ImeiJustificado = Database['public']['Tables']['imei_justificado']['Row']
export type ImeiJustificadoInsert = Database['public']['Tables']['imei_justificado']['Insert']
export type ImeiJustificadoUpdate = Database['public']['Tables']['imei_justificado']['Update']

export type BugSamsung = Database['public']['Tables']['bugs_samsung']['Row']
export type BugSamsungInsert = Database['public']['Tables']['bugs_samsung']['Insert']
export type BugSamsungUpdate = Database['public']['Tables']['bugs_samsung']['Update']

export type MarcadoHorarios = Database['public']['Tables']['marcado_horarios']['Row']
export type MarcadoHorariosInsert = Database['public']['Tables']['marcado_horarios']['Insert']
export type MarcadoHorariosUpdate = Database['public']['Tables']['marcado_horarios']['Update']

// Tipos para respuestas de funciones
export interface MarcadoResponse {
  success: boolean
  message: string
  marcado?: MarcadoHorarios
}

export interface EstadoMarcadoHoy {
  exists: boolean
  fecha: string
  puede_marcar_entrada: boolean
  puede_marcar_salida: boolean
  marcado?: MarcadoHorarios
}

export interface ResumenHorariosMes {
  periodo: {
    anio: number
    mes: number
    inicio: string
    fin: string
  }
  total_dias_trabajados: number
  total_horas: number
  promedio_horas_dia: number
  dias_sin_salida: number
  detalles: Array<{
    fecha: string
    hora_entrada: string | null
    hora_salida: string | null
    total_horas: number
    completo: boolean
  }>
} 