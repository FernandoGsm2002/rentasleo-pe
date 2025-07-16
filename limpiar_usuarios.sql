-- Script para limpiar usuarios incorrectos

-- 1. Mostrar usuarios actuales antes de limpiar
SELECT 
  'ANTES DE LIMPIAR' as estado,
  id,
  email,
  nombre,
  rol,
  activo,
  created_at
FROM usuarios 
ORDER BY created_at;

-- 2. Eliminar usuarios con email vacío o rol trabajador que no deberían existir
DELETE FROM usuarios 
WHERE email = '' OR email IS NULL;

-- 3. Eliminar usuarios duplicados que no sean el admin principal
DELETE FROM usuarios 
WHERE id = 'a826c370-390b-4ad3-9394-ec57a2803050' -- Este es el ID que se creó incorrectamente
  AND email != 'admin@leope.com';

-- 4. Asegurar que el admin tenga el rol correcto
UPDATE usuarios 
SET 
  rol = 'creador',
  nombre = 'Admin',
  updated_at = NOW()
WHERE email = 'admin@leope.com';

-- 5. Mostrar usuarios después de limpiar
SELECT 
  'DESPUÉS DE LIMPIAR' as estado,
  id,
  email,
  nombre,
  rol,
  activo,
  created_at,
  updated_at
FROM usuarios 
ORDER BY created_at; 