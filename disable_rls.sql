-- Deshabilitar RLS para sistema interno de 5 usuarios
-- Ejecutar en Supabase SQL Editor

-- Deshabilitar RLS en todas las tablas principales
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE ingresos DISABLE ROW LEVEL SECURITY;
ALTER TABLE dias_trabajados DISABLE ROW LEVEL SECURITY;
ALTER TABLE rentas_herramientas DISABLE ROW LEVEL SECURITY;
ALTER TABLE imei_justificado DISABLE ROW LEVEL SECURITY;
ALTER TABLE bugs_samsung DISABLE ROW LEVEL SECURITY;
ALTER TABLE marcado_horarios DISABLE ROW LEVEL SECURITY;

-- Eliminar cualquier política existente (por si acaso)
DROP POLICY IF EXISTS "Enable read access for all users" ON usuarios;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON usuarios;
DROP POLICY IF EXISTS "Enable update for users based on email" ON usuarios;
DROP POLICY IF EXISTS "Users can view all users" ON usuarios;
DROP POLICY IF EXISTS "Users can insert all users" ON usuarios;
DROP POLICY IF EXISTS "Users can update all users" ON usuarios;

DROP POLICY IF EXISTS "Enable read access for all users" ON ingresos;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON ingresos;
DROP POLICY IF EXISTS "Users can view all ingresos" ON ingresos;
DROP POLICY IF EXISTS "Users can insert ingresos" ON ingresos;

DROP POLICY IF EXISTS "Enable read access for all users" ON dias_trabajados;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON dias_trabajados;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON dias_trabajados;

DROP POLICY IF EXISTS "Enable read access for all users" ON rentas_herramientas;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON rentas_herramientas;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON rentas_herramientas;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON rentas_herramientas;

DROP POLICY IF EXISTS "Enable read access for all users" ON imei_justificado;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON imei_justificado;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON imei_justificado;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON imei_justificado;

DROP POLICY IF EXISTS "Enable read access for all users" ON bugs_samsung;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON bugs_samsung;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON bugs_samsung;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON bugs_samsung;

DROP POLICY IF EXISTS "Enable read access for all users" ON marcado_horarios;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON marcado_horarios;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON marcado_horarios;

-- Verificar que RLS está deshabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('usuarios', 'ingresos', 'dias_trabajados', 'rentas_herramientas', 'imei_justificado', 'bugs_samsung', 'marcado_horarios')
ORDER BY tablename;

-- Mensaje de confirmación
SELECT 'RLS DESHABILITADO - Sistema configurado para 5 usuarios internos' as status; 