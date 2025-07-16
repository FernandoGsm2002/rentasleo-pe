-- Actualización del Schema para Sistema de Sueldos y Control Horario
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar campo de sueldo base a la tabla usuarios
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS sueldo_base DECIMAL(10,2) DEFAULT 0.00;

-- Comentario para el nuevo campo
COMMENT ON COLUMN usuarios.sueldo_base IS 'Sueldo diario - solo se paga si marca entrada Y salida el mismo día';

-- 2. Crear tabla de marcado de horarios (entrada y salida)
CREATE TABLE IF NOT EXISTS marcado_horarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_entrada TIMESTAMP WITH TIME ZONE,
  hora_salida TIMESTAMP WITH TIME ZONE,
  total_horas DECIMAL(4,2) GENERATED ALWAYS AS (
    CASE 
      WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (hora_salida - hora_entrada))/3600 
      ELSE 0 
    END
  ) STORED,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, fecha)
);

-- Comentarios en la tabla
COMMENT ON TABLE marcado_horarios IS 'Control de entrada y salida diaria de trabajadores con cálculo automático de horas';
COMMENT ON COLUMN marcado_horarios.total_horas IS 'Horas trabajadas calculadas automáticamente (entrada - salida)';

-- 3. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_marcado_horarios_usuario_fecha ON marcado_horarios(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_marcado_horarios_fecha ON marcado_horarios(fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_sueldo_base ON usuarios(sueldo_base) WHERE sueldo_base > 0;

-- 4. Función para marcar entrada
CREATE OR REPLACE FUNCTION marcar_entrada(
    trabajador_id UUID,
    fecha_marcado DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
    marcado_existente marcado_horarios%ROWTYPE;
BEGIN
    -- Verificar si ya existe un marcado para esta fecha
    SELECT * INTO marcado_existente 
    FROM marcado_horarios 
    WHERE usuario_id = trabajador_id AND fecha = fecha_marcado;
    
    IF marcado_existente.id IS NOT NULL THEN
        -- Si ya marcó entrada, devolver error
        IF marcado_existente.hora_entrada IS NOT NULL THEN
            SELECT json_build_object(
                'success', false,
                'message', 'Ya has marcado entrada para hoy',
                'marcado', row_to_json(marcado_existente)
            ) INTO resultado;
            RETURN resultado;
        END IF;
    ELSE
        -- Crear nuevo registro de marcado
        INSERT INTO marcado_horarios (usuario_id, fecha, hora_entrada)
        VALUES (trabajador_id, fecha_marcado, NOW())
        RETURNING * INTO marcado_existente;
    END IF;
    
    -- Si llegamos aquí, marcamos entrada exitosamente
    UPDATE marcado_horarios 
    SET hora_entrada = NOW(), updated_at = NOW()
    WHERE id = marcado_existente.id
    RETURNING * INTO marcado_existente;
    
    SELECT json_build_object(
        'success', true,
        'message', 'Entrada marcada exitosamente',
        'marcado', row_to_json(marcado_existente)
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para marcar salida
CREATE OR REPLACE FUNCTION marcar_salida(
    trabajador_id UUID,
    fecha_marcado DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
    marcado_existente marcado_horarios%ROWTYPE;
BEGIN
    -- Buscar el marcado del día
    SELECT * INTO marcado_existente 
    FROM marcado_horarios 
    WHERE usuario_id = trabajador_id AND fecha = fecha_marcado;
    
    -- Verificaciones
    IF marcado_existente.id IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'No has marcado entrada para hoy'
        ) INTO resultado;
        RETURN resultado;
    END IF;
    
    IF marcado_existente.hora_entrada IS NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Debes marcar entrada antes de marcar salida'
        ) INTO resultado;
        RETURN resultado;
    END IF;
    
    IF marcado_existente.hora_salida IS NOT NULL THEN
        SELECT json_build_object(
            'success', false,
            'message', 'Ya has marcado salida para hoy',
            'marcado', row_to_json(marcado_existente)
        ) INTO resultado;
        RETURN resultado;
    END IF;
    
    -- Marcar salida
    UPDATE marcado_horarios 
    SET hora_salida = NOW(), updated_at = NOW()
    WHERE id = marcado_existente.id
    RETURNING * INTO marcado_existente;
    
    SELECT json_build_object(
        'success', true,
        'message', 'Salida marcada exitosamente',
        'marcado', row_to_json(marcado_existente)
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para obtener el marcado del día actual
CREATE OR REPLACE FUNCTION get_marcado_hoy(trabajador_id UUID)
RETURNS JSON AS $$
DECLARE
    marcado_hoy marcado_horarios%ROWTYPE;
    resultado JSON;
BEGIN
    SELECT * INTO marcado_hoy 
    FROM marcado_horarios 
    WHERE usuario_id = trabajador_id AND fecha = CURRENT_DATE;
    
    IF marcado_hoy.id IS NULL THEN
        SELECT json_build_object(
            'exists', false,
            'fecha', CURRENT_DATE,
            'puede_marcar_entrada', true,
            'puede_marcar_salida', false
        ) INTO resultado;
    ELSE
        SELECT json_build_object(
            'exists', true,
            'marcado', row_to_json(marcado_hoy),
            'puede_marcar_entrada', marcado_hoy.hora_entrada IS NULL,
            'puede_marcar_salida', marcado_hoy.hora_entrada IS NOT NULL AND marcado_hoy.hora_salida IS NULL
        ) INTO resultado;
    END IF;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para obtener resumen de horarios del mes
CREATE OR REPLACE FUNCTION get_resumen_horarios_mes(
    trabajador_id UUID,
    anio INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    mes INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)
)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
    inicio_mes DATE;
    fin_mes DATE;
BEGIN
    inicio_mes := DATE(anio || '-' || mes || '-01');
    fin_mes := (inicio_mes + INTERVAL '1 month - 1 day')::DATE;
    
    SELECT json_build_object(
        'periodo', json_build_object(
            'anio', anio,
            'mes', mes,
            'inicio', inicio_mes,
            'fin', fin_mes
        ),
        'total_dias_trabajados', (
            SELECT COUNT(*) 
            FROM marcado_horarios 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN inicio_mes AND fin_mes
            AND hora_entrada IS NOT NULL
        ),
        'total_horas', (
            SELECT COALESCE(SUM(total_horas), 0) 
            FROM marcado_horarios 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN inicio_mes AND fin_mes
            AND hora_salida IS NOT NULL
        ),
        'promedio_horas_dia', (
            SELECT COALESCE(AVG(total_horas), 0) 
            FROM marcado_horarios 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN inicio_mes AND fin_mes
            AND hora_salida IS NOT NULL
        ),
        'dias_sin_salida', (
            SELECT COUNT(*) 
            FROM marcado_horarios 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN inicio_mes AND fin_mes
            AND hora_entrada IS NOT NULL 
            AND hora_salida IS NULL
        ),
        'detalles', (
            SELECT json_agg(
                json_build_object(
                    'fecha', fecha,
                    'hora_entrada', hora_entrada,
                    'hora_salida', hora_salida,
                    'total_horas', total_horas,
                    'completo', hora_entrada IS NOT NULL AND hora_salida IS NOT NULL
                ) ORDER BY fecha DESC
            )
            FROM marcado_horarios 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN inicio_mes AND fin_mes
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 8. Actualizar tipos en Supabase (TypeScript)
-- Nota: Ejecutar después para actualizar los tipos de TypeScript

-- Comentarios en las funciones
COMMENT ON FUNCTION marcar_entrada(UUID, DATE) IS 'Marca la hora de entrada de un trabajador para un día específico';
COMMENT ON FUNCTION marcar_salida(UUID, DATE) IS 'Marca la hora de salida de un trabajador para un día específico';
COMMENT ON FUNCTION get_marcado_hoy(UUID) IS 'Obtiene el estado del marcado del día actual para un trabajador';
COMMENT ON FUNCTION get_resumen_horarios_mes(UUID, INTEGER, INTEGER) IS 'Obtiene resumen completo de horarios trabajados en un mes específico';

-- 9. Función para calcular días trabajados completos y monto a pagar
CREATE OR REPLACE FUNCTION calcular_pago_trabajador(
    trabajador_id UUID,
    fecha_inicio DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
    sueldo_diario DECIMAL(10,2);
    dias_completos INTEGER;
    monto_total DECIMAL(10,2);
BEGIN
    -- Obtener el sueldo diario del trabajador
    SELECT sueldo_base INTO sueldo_diario 
    FROM usuarios 
    WHERE id = trabajador_id;
    
    -- Contar días con marcado completo (entrada Y salida)
    SELECT COUNT(*) INTO dias_completos
    FROM marcado_horarios 
    WHERE usuario_id = trabajador_id 
    AND fecha BETWEEN fecha_inicio AND fecha_fin
    AND hora_entrada IS NOT NULL 
    AND hora_salida IS NOT NULL;
    
    -- Calcular monto total
    monto_total := dias_completos * sueldo_diario;
    
    SELECT json_build_object(
        'trabajador_id', trabajador_id,
        'periodo', json_build_object(
            'inicio', fecha_inicio,
            'fin', fecha_fin
        ),
        'sueldo_diario', sueldo_diario,
        'dias_trabajados_completos', dias_completos,
        'monto_total_a_pagar', monto_total,
        'detalles_dias', (
            SELECT json_agg(
                json_build_object(
                    'fecha', fecha,
                    'hora_entrada', hora_entrada,
                    'hora_salida', hora_salida,
                    'total_horas', total_horas,
                    'es_dia_completo', hora_entrada IS NOT NULL AND hora_salida IS NOT NULL,
                    'monto_dia', CASE 
                        WHEN hora_entrada IS NOT NULL AND hora_salida IS NOT NULL 
                        THEN sueldo_diario 
                        ELSE 0 
                    END
                ) ORDER BY fecha DESC
            )
            FROM marcado_horarios 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN fecha_inicio AND fecha_fin
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- 10. Función para obtener resumen de pagos de todos los trabajadores
CREATE OR REPLACE FUNCTION get_resumen_pagos_todos_trabajadores(
    fecha_inicio DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'periodo', json_build_object(
            'inicio', fecha_inicio,
            'fin', fecha_fin
        ),
        'resumen_general', json_build_object(
            'total_trabajadores', (
                SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador' AND activo = true
            ),
            'total_dias_completos', (
                SELECT COUNT(*) FROM marcado_horarios mh
                JOIN usuarios u ON u.id = mh.usuario_id
                WHERE u.rol = 'trabajador' 
                AND mh.fecha BETWEEN fecha_inicio AND fecha_fin
                AND mh.hora_entrada IS NOT NULL 
                AND mh.hora_salida IS NOT NULL
            ),
            'monto_total_periodo', (
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN mh.hora_entrada IS NOT NULL AND mh.hora_salida IS NOT NULL 
                        THEN u.sueldo_base 
                        ELSE 0 
                    END
                ), 0)
                FROM marcado_horarios mh
                JOIN usuarios u ON u.id = mh.usuario_id
                WHERE u.rol = 'trabajador' 
                AND mh.fecha BETWEEN fecha_inicio AND fecha_fin
            )
        ),
        'detalle_por_trabajador', (
            SELECT json_agg(
                json_build_object(
                    'trabajador', json_build_object(
                        'id', u.id,
                        'nombre', u.nombre,
                        'email', u.email,
                        'sueldo_diario', u.sueldo_base
                    ),
                    'dias_completos', (
                        SELECT COUNT(*) FROM marcado_horarios mh2
                        WHERE mh2.usuario_id = u.id 
                        AND mh2.fecha BETWEEN fecha_inicio AND fecha_fin
                        AND mh2.hora_entrada IS NOT NULL 
                        AND mh2.hora_salida IS NOT NULL
                    ),
                    'dias_incompletos', (
                        SELECT COUNT(*) FROM marcado_horarios mh2
                        WHERE mh2.usuario_id = u.id 
                        AND mh2.fecha BETWEEN fecha_inicio AND fecha_fin
                        AND (mh2.hora_entrada IS NULL OR mh2.hora_salida IS NULL)
                    ),
                    'monto_a_pagar', (
                        SELECT COALESCE(SUM(
                            CASE 
                                WHEN mh2.hora_entrada IS NOT NULL AND mh2.hora_salida IS NOT NULL 
                                THEN u.sueldo_base 
                                ELSE 0 
                            END
                        ), 0)
                        FROM marcado_horarios mh2
                        WHERE mh2.usuario_id = u.id 
                        AND mh2.fecha BETWEEN fecha_inicio AND fecha_fin
                    )
                ) ORDER BY u.nombre
            )
            FROM usuarios u
            WHERE u.rol = 'trabajador' AND u.activo = true
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Comentarios en las nuevas funciones
COMMENT ON FUNCTION calcular_pago_trabajador(UUID, DATE, DATE) IS 'Calcula el pago de un trabajador basado en días completos (entrada Y salida)';
COMMENT ON FUNCTION get_resumen_pagos_todos_trabajadores(DATE, DATE) IS 'Obtiene resumen de pagos de todos los trabajadores para un período';

-- Verificar que todo se creó correctamente
SELECT 'Actualización completada exitosamente - Sistema de sueldo diario implementado' as resultado; 