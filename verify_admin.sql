-- Script para verificar el estado del usuario administrador

-- 1. Ver todos los usuarios existentes
SELECT 'TODOS LOS USUARIOS:' as seccion;
SELECT id, email, nombre, rol, activo, created_at
FROM usuarios 
ORDER BY created_at DESC;

-- 2. Verificar si existe algún usuario con rol 'creador'
SELECT 'USUARIOS ADMINISTRADORES:' as seccion;
SELECT id, email, nombre, rol, activo, created_at
FROM usuarios 
WHERE rol = 'creador';

-- 3. Verificar usuarios recientes (últimas 24 horas)
SELECT 'USUARIOS RECIENTES:' as seccion;
SELECT id, email, nombre, rol, activo, created_at
FROM usuarios 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 4. Ver el total por rol
SELECT 'CONTEO POR ROL:' as seccion;
SELECT rol, COUNT(*) as total
FROM usuarios 
GROUP BY rol;

-- 5. Ver usuarios activos vs inactivos
SELECT 'USUARIOS POR ESTADO:' as seccion;
SELECT activo, COUNT(*) as total
FROM usuarios 
GROUP BY activo; 