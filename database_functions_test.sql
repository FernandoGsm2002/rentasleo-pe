-- Funciones esenciales para el Sistema de Rentas - VERSION DE PRUEBA
-- Ejecutar SOLO si database_functions.sql falla

-- Función básica para obtener estadísticas del dashboard de administrador
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    hoy DATE := CURRENT_DATE;
    inicio_mes DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
BEGIN
    SELECT json_build_object(
        'total_trabajadores', (
            SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador'
        ),
        'trabajadores_activos', (
            SELECT COUNT(*) FROM usuarios WHERE rol = 'trabajador' AND activo = true
        ),
        'ingresos_hoy', (
            SELECT COUNT(*) FROM ingresos 
            WHERE fecha_ingreso::DATE = hoy
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
            WHERE created_at >= inicio_mes
        ),
        'bugs_samsung_mes', (
            SELECT COALESCE(SUM(cantidad_bugs), 0) 
            FROM bugs_samsung WHERE fecha >= inicio_mes
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para crear usuario administrador
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

-- Función para marcar ingreso
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

-- Índices básicos SIN funciones
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_ingresos_usuario ON ingresos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ingresos_fecha ON ingresos(fecha_ingreso);
CREATE INDEX IF NOT EXISTS idx_rentas_activa ON rentas_herramientas(activa);
CREATE INDEX IF NOT EXISTS idx_dias_trabajados_usuario ON dias_trabajados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_bugs_samsung_usuario ON bugs_samsung(usuario_id);

-- Comentarios
COMMENT ON FUNCTION get_admin_dashboard_stats() IS 'Obtiene estadísticas básicas para el dashboard del administrador';
COMMENT ON FUNCTION crear_usuario_admin(UUID, VARCHAR, VARCHAR) IS 'Crea o actualiza un usuario con rol de administrador';
COMMENT ON FUNCTION marcar_ingreso(UUID, INET, TEXT) IS 'Registra un nuevo ingreso al sistema'; 