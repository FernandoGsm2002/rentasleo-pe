-- Script para actualizar el rol del usuario admin a 'creador'
-- Este usuario ya existe en la base de datos pero tiene rol 'trabajador'

UPDATE usuarios 
SET 
  rol = 'creador',
  nombre = 'Admin',
  updated_at = NOW()
WHERE id = 'a826c370-390b-4ad3-9394-ec57a2803050';

-- Verificar que el cambio se aplicó correctamente
SELECT 
  id,
  email,
  nombre,
  rol,
  activo,
  created_at,
  updated_at
FROM usuarios 
WHERE id = 'a826c370-390b-4ad3-9394-ec57a2803050'; 