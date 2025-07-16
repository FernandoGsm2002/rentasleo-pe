-- Script para verificar el estado actual de los usuarios

-- 1. Mostrar todos los usuarios
SELECT 
  id,
  email,
  nombre,
  rol,
  activo,
  created_at,
  updated_at
FROM usuarios 
ORDER BY created_at;

-- 2. Verificar específicamente el admin
SELECT 
  'Usuario admin' as tipo,
  id,
  email,
  nombre,
  rol,
  activo
FROM usuarios 
WHERE email = 'admin@leope.com';

-- 3. Contar usuarios por rol
SELECT 
  rol,
  COUNT(*) as cantidad
FROM usuarios 
GROUP BY rol; 