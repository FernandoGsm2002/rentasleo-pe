# Configuración del Usuario Superadmin

## Pasos para crear el usuario administrador inicial

### 1. Ejecutar scripts SQL en Supabase

Primero, ejecuta los scripts SQL en el siguiente orden en el Editor SQL de Supabase:

1. **database_schema.sql** - Crear las tablas
2. **database_functions.sql** - Crear las funciones (¡YA CORREGIDO!)

### 2. Registrar usuario en la aplicación

1. Ve a tu aplicación web local: `http://localhost:3000`
2. En la pantalla de login, registra un nuevo usuario con:
   - Email: `admin@sistema-rentas.com` (o el email que prefieras)
   - Contraseña: (elige una segura)

### 3. Obtener el UUID del usuario

Después del registro exitoso, ve al panel de Supabase:

1. Ve a **Authentication > Users**
2. Encuentra tu usuario recién creado
3. Copia el **UUID** del usuario (algo como: `12345678-1234-1234-1234-123456789abc`)

### 4. Asignar rol de administrador

En el Editor SQL de Supabase, ejecuta esta función con el UUID real:

```sql
-- Reemplaza 'TU_UUID_AQUI' con el UUID copiado del paso anterior
-- Reemplaza 'admin@sistema-rentas.com' con el email que usaste
SELECT crear_usuario_admin(
    'TU_UUID_AQUI'::UUID,
    'admin@sistema-rentas.com',
    'Administrador Principal'
);
```

### 5. Verificar la creación

Ejecuta esta consulta para verificar que el usuario se creó correctamente:

```sql
SELECT id, email, nombre, rol, activo, created_at
FROM usuarios 
WHERE rol = 'creador';
```

### 6. Iniciar sesión como administrador

1. Cierra sesión en la aplicación
2. Inicia sesión con las credenciales del administrador
3. Deberías ser redirigido al dashboard de administrador

## Solución de problemas

### Si el usuario ya existe pero no es administrador:

```sql
-- Actualizar usuario existente a administrador
UPDATE usuarios 
SET rol = 'creador', activo = true, updated_at = NOW()
WHERE email = 'admin@sistema-rentas.com';
```

### Si necesitas cambiar el UUID después del registro:

```sql
-- Actualizar UUID de usuario existente
UPDATE usuarios 
SET id = 'NUEVO_UUID_AQUI'::UUID
WHERE email = 'admin@sistema-rentas.com';
```

### Verificar autenticación:

```sql
-- Ver todos los usuarios del sistema
SELECT id, email, nombre, rol, activo 
FROM usuarios 
ORDER BY created_at DESC;
```

## Notas importantes

- ⚠️ El UUID debe coincidir exactamente con el UUID de Supabase Auth
- ⚠️ Solo debe haber un usuario con rol 'creador' por seguridad
- ✅ Los errores SQL de funciones inmutables ya están corregidos
- ✅ Todas las páginas del dashboard están configuradas para evitar errores de build 