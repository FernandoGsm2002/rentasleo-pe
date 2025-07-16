-- Funciones adicionales para el Sistema de Rentas

-- Función para obtener estadísticas del dashboard de administrador
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    hoy DATE := CURRENT_DATE;
    inicio_mes DATE;
BEGIN
    inicio_mes := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    SELECT json_build_object(
        'total_trabajadores', (
            SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador'
        ),
        'trabajadores_activos', (
            SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador' AND activo = true
        ),
        'ingresos_hoy', (
            SELECT COUNT(*) FROM ingresos 
            WHERE DATE(fecha_ingreso) = hoy
        ),
        'monto_total_pendiente', (
            SELECT COALESCE(SUM(monto_asignado), 0) 
            FROM dias_trabajados WHERE pagado = false
        ),
        'rentas_activas', (
            SELECT COUNT(*) FROM rentas_herramientas WHERE activa = true
        ),
        'imeis_procesados_mes', (
            SELECT COUNT(*) FROM imei_justificado 
            WHERE DATE(created_at) >= inicio_mes
        ),
        'bugs_samsung_mes', (
            SELECT COALESCE(SUM(cantidad_bugs), 0) 
            FROM bugs_samsung WHERE fecha >= inicio_mes
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas de un trabajador específico
CREATE OR REPLACE FUNCTION get_trabajador_stats(trabajador_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    hoy DATE := CURRENT_DATE;
    inicio_mes DATE;
BEGIN
    inicio_mes := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    SELECT json_build_object(
        'dias_trabajados', (
            SELECT COUNT(*) FROM dias_trabajados WHERE usuario_id = trabajador_id
        ),
        'monto_pendiente', (
            SELECT COALESCE(SUM(monto_asignado), 0) 
            FROM dias_trabajados 
            WHERE usuario_id = trabajador_id AND pagado = false
        ),
        'monto_pagado', (
            SELECT COALESCE(SUM(monto_asignado), 0) 
            FROM dias_trabajados 
            WHERE usuario_id = trabajador_id AND pagado = true
        ),
        'ingresos_hoy', (
            SELECT COUNT(*) FROM ingresos 
            WHERE usuario_id = trabajador_id AND DATE(fecha_ingreso) = hoy
        ),
        'rentas_activas', (
            SELECT COUNT(*) FROM rentas_herramientas 
            WHERE usuario_responsable_id = trabajador_id AND activa = true
        ),
        'imeis_procesados_mes', (
            SELECT COUNT(*) FROM imei_justificado 
            WHERE usuario_procesado_id = trabajador_id AND DATE(created_at) >= inicio_mes
        ),
        'bugs_samsung_mes', (
            SELECT COALESCE(SUM(cantidad_bugs), 0) 
            FROM bugs_samsung 
            WHERE usuario_id = trabajador_id AND fecha >= inicio_mes
        ),
        'ganancias_bugs_mes', (
            SELECT COALESCE(SUM(total_ganado), 0) 
            FROM bugs_samsung 
            WHERE usuario_id = trabajador_id AND fecha >= inicio_mes
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar y actualizar rentas vencidas
CREATE OR REPLACE FUNCTION verificar_rentas_vencidas()
RETURNS INTEGER AS $$
DECLARE
    rentas_actualizadas INTEGER;
BEGIN
    UPDATE rentas_herramientas 
    SET activa = false, 
        notificacion_enviada = true,
        updated_at = NOW()
    WHERE activa = true 
    AND fecha_fin < NOW() 
    AND notificacion_enviada = false;
    
    GET DIAGNOSTICS rentas_actualizadas = ROW_COUNT;
    
    RETURN rentas_actualizadas;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el ranking de bugs por usuario en un mes
CREATE OR REPLACE FUNCTION get_bugs_ranking(mes DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
    usuario_id UUID,
    usuario_nombre VARCHAR,
    total_bugs INTEGER,
    total_ganancias NUMERIC,
    dias_trabajados INTEGER,
    promedio_por_dia NUMERIC
) AS $$
DECLARE
    inicio_mes DATE;
    fin_mes DATE;
BEGIN
    -- Calcular fechas del mes
    inicio_mes := DATE_TRUNC('month', mes)::DATE;
    fin_mes := (DATE_TRUNC('month', mes) + INTERVAL '1 month - 1 day')::DATE;
    
    RETURN QUERY
    SELECT 
        u.id as usuario_id,
        u.nombre as usuario_nombre,
        COALESCE(SUM(bs.cantidad_bugs), 0)::INTEGER as total_bugs,
        COALESCE(SUM(bs.total_ganado), 0) as total_ganancias,
        COUNT(DISTINCT bs.fecha)::INTEGER as dias_trabajados,
        CASE 
            WHEN COUNT(DISTINCT bs.fecha) > 0 
            THEN COALESCE(SUM(bs.cantidad_bugs), 0)::NUMERIC / COUNT(DISTINCT bs.fecha)
            ELSE 0
        END as promedio_por_dia
    FROM usuarios u
    LEFT JOIN bugs_samsung bs ON u.id = bs.usuario_id 
        AND bs.fecha >= inicio_mes 
        AND bs.fecha <= fin_mes
    WHERE u.rol = 'trabajador' AND u.activo = true
    GROUP BY u.id, u.nombre
    HAVING COALESCE(SUM(bs.cantidad_bugs), 0) > 0
    ORDER BY total_bugs DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener reporte de actividad por usuario
CREATE OR REPLACE FUNCTION get_reporte_actividad_usuario(
    trabajador_id UUID,
    fecha_inicio DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    fecha_fin DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'usuario', (
            SELECT json_build_object(
                'id', id,
                'nombre', nombre,
                'email', email,
                'activo', activo
            ) FROM usuarios WHERE id = trabajador_id
        ),
        'periodo', json_build_object(
            'inicio', fecha_inicio,
            'fin', fecha_fin
        ),
        'dias_trabajados', (
            SELECT json_agg(
                json_build_object(
                    'fecha', fecha,
                    'horas_trabajadas', horas_trabajadas,
                    'monto_asignado', monto_asignado,
                    'pagado', pagado,
                    'fecha_pago', fecha_pago
                )
            ) FROM dias_trabajados 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN fecha_inicio AND fecha_fin
            ORDER BY fecha DESC
        ),
        'ingresos', (
            SELECT json_agg(
                json_build_object(
                    'fecha', DATE(fecha_ingreso),
                    'hora', fecha_ingreso::TIME,
                    'ip_address', ip_address
                )
            ) FROM ingresos 
            WHERE usuario_id = trabajador_id 
            AND DATE(fecha_ingreso) BETWEEN fecha_inicio AND fecha_fin
            ORDER BY fecha_ingreso DESC
        ),
        'bugs_samsung', (
            SELECT json_agg(
                json_build_object(
                    'fecha', fecha,
                    'cantidad_bugs', cantidad_bugs,
                    'precio_por_bug', precio_por_bug,
                    'total_ganado', total_ganado,
                    'descripcion', descripcion
                )
            ) FROM bugs_samsung 
            WHERE usuario_id = trabajador_id 
            AND fecha BETWEEN fecha_inicio AND fecha_fin
            ORDER BY fecha DESC
        ),
        'imeis_procesados', (
            SELECT json_agg(
                json_build_object(
                    'fecha', DATE(created_at),
                    'imei', imei,
                    'modelo_nombre', modelo_nombre,
                    'estado_osiptel', estado_osiptel,
                    'monto_cobrado', monto_cobrado
                )
            ) FROM imei_justificado 
            WHERE usuario_procesado_id = trabajador_id 
            AND DATE(created_at) BETWEEN fecha_inicio AND fecha_fin
            ORDER BY created_at DESC
        ),
        'resumen', json_build_object(
            'total_dias_trabajados', (
                SELECT COUNT(*) FROM dias_trabajados 
                WHERE usuario_id = trabajador_id 
                AND fecha BETWEEN fecha_inicio AND fecha_fin
            ),
            'total_horas', (
                SELECT COALESCE(SUM(horas_trabajadas), 0) FROM dias_trabajados 
                WHERE usuario_id = trabajador_id 
                AND fecha BETWEEN fecha_inicio AND fecha_fin
            ),
            'total_monto_asignado', (
                SELECT COALESCE(SUM(monto_asignado), 0) FROM dias_trabajados 
                WHERE usuario_id = trabajador_id 
                AND fecha BETWEEN fecha_inicio AND fecha_fin
            ),
            'total_bugs', (
                SELECT COALESCE(SUM(cantidad_bugs), 0) FROM bugs_samsung 
                WHERE usuario_id = trabajador_id 
                AND fecha BETWEEN fecha_inicio AND fecha_fin
            ),
            'total_ganancias_bugs', (
                SELECT COALESCE(SUM(total_ganado), 0) FROM bugs_samsung 
                WHERE usuario_id = trabajador_id 
                AND fecha BETWEEN fecha_inicio AND fecha_fin
            ),
            'total_imeis', (
                SELECT COUNT(*) FROM imei_justificado 
                WHERE usuario_procesado_id = trabajador_id 
                AND DATE(created_at) BETWEEN fecha_inicio AND fecha_fin
            ),
            'total_ingresos', (
                SELECT COUNT(*) FROM ingresos 
                WHERE usuario_id = trabajador_id 
                AND DATE(fecha_ingreso) BETWEEN fecha_inicio AND fecha_fin
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar un ingreso al sistema
CREATE OR REPLACE FUNCTION marcar_ingreso(
    trabajador_id UUID,
    ip_cliente INET DEFAULT NULL,
    user_agent_cliente TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    nuevo_ingreso_id UUID;
BEGIN
    INSERT INTO ingresos (
        usuario_id,
        ip_address,
        user_agent,
        fecha_ingreso
    ) VALUES (
        trabajador_id,
        ip_cliente,
        user_agent_cliente,
        NOW()
    ) RETURNING id INTO nuevo_ingreso_id;
    
    RETURN nuevo_ingreso_id;
END;
$$ LANGUAGE plpgsql;

-- Crear índices adicionales para mejorar performance
-- Índices simples sin funciones para evitar problemas de inmutabilidad
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha_ingreso ON ingresos(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_bugs_samsung_fecha ON bugs_samsung(fecha);
CREATE INDEX IF NOT EXISTS idx_imei_created_at ON imei_justificado(created_at);
CREATE INDEX IF NOT EXISTS idx_rentas_fecha_fin ON rentas_herramientas(fecha_fin) WHERE activa = true;
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_dias_trabajados_usuario_fecha ON dias_trabajados(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ingresos_usuario ON ingresos(usuario_id);

-- Función para crear o actualizar usuario administrador
CREATE OR REPLACE FUNCTION crear_usuario_admin(
    user_id UUID,
    email_admin VARCHAR(255),
    nombre_admin VARCHAR(100) DEFAULT 'Administrador del Sistema'
)
RETURNS UUID AS $$
DECLARE
    usuario_id UUID;
BEGIN
    INSERT INTO usuarios (id, email, nombre, rol, activo)
    VALUES (user_id, email_admin, nombre_admin, 'creador', true)
    ON CONFLICT (email) DO UPDATE SET
        id = EXCLUDED.id,
        nombre = EXCLUDED.nombre,
        rol = 'creador',
        activo = true,
        updated_at = NOW()
    RETURNING id INTO usuario_id;
    
    RETURN usuario_id;
END;
$$ LANGUAGE plpgsql;

-- Comentarios en las funciones
COMMENT ON FUNCTION get_admin_dashboard_stats() IS 'Obtiene estadísticas generales para el dashboard del administrador';
COMMENT ON FUNCTION get_trabajador_stats(UUID) IS 'Obtiene estadísticas específicas de un trabajador';
COMMENT ON FUNCTION verificar_rentas_vencidas() IS 'Verifica y marca como inactivas las rentas vencidas';
COMMENT ON FUNCTION get_bugs_ranking(DATE) IS 'Obtiene el ranking de bugs procesados por usuario en un mes';
COMMENT ON FUNCTION get_reporte_actividad_usuario(UUID, DATE, DATE) IS 'Genera reporte completo de actividad de un usuario';
COMMENT ON FUNCTION marcar_ingreso(UUID, INET, TEXT) IS 'Registra un nuevo ingreso al sistema';
COMMENT ON FUNCTION crear_usuario_admin(UUID, VARCHAR, VARCHAR) IS 'Crea o actualiza un usuario con rol de administrador'; 