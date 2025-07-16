-- Script para crear el usuario superadmin inicial
-- Ejecutar DESPUÉS de crear las tablas y funciones

-- Insertar el usuario superadmin (creador)
-- Nota: El ID debe coincidir con el UUID de autenticación de Supabase
INSERT INTO usuarios (id, email, nombre, rol, activo)
VALUES (
    gen_random_uuid(), -- Se reemplazará con el UUID real de Supabase Auth
    'admin@sistema-rentas.com', -- Cambiar por el email real del administrador
    'Administrador del Sistema',
    'creador',
    true
)
ON CONFLICT (email) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    rol = EXCLUDED.rol,
    activo = EXCLUDED.activo;

-- Comentario de instrucciones
-- IMPORTANTE: 
-- 1. Primero crear el usuario en Supabase Auth (registro normal)
-- 2. Obtener el UUID del usuario desde Supabase Auth
-- 3. Actualizar este script con el UUID real
-- 4. Ejecutar este script para asignar el rol de 'creador'

-- Ejemplo de actualización con UUID real:
-- UPDATE usuarios 
-- SET id = '12345678-1234-1234-1234-123456789abc' -- UUID real de Supabase Auth
-- WHERE email = 'admin@sistema-rentas.com';

-- Verificar que el usuario se creó correctamente
SELECT id, email, nombre, rol, activo, created_at
FROM usuarios 
WHERE rol = 'creador'; 