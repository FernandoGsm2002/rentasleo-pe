# 🚀 Instrucciones de Configuración - Sistema de Rentas

## 📋 Resumen del Proyecto

**Sistema completo de gestión para control de trabajadores, rentas de herramientas, registros IMEI y bugs Samsung.**

### ✅ **Estado Actual: 100% COMPLETADO**

**Módulos Implementados:**
- ✅ **Autenticación completa** con roles (Creador/Trabajador)
- ✅ **Dashboard diferenciado** por tipo de usuario
- ✅ **Sistema de marcado de ingresos** automático
- ✅ **Gestión de rentas** de herramientas (UnlockTool, Pandora, DFT Pro)
- ✅ **Módulo IMEI justificado** con verificación OSIPTEL
- ✅ **Contador de bugs Samsung** con cálculos automáticos
- ✅ **Reportes y estadísticas** en tiempo real

---

## 🛠️ Configuración Inicial

### 1. **Configurar Base de Datos en Supabase**

1. Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto
2. En el **SQL Editor**, ejecuta **EN ESTE ORDEN**:

```sql
-- 1. Primero ejecutar database_schema.sql
-- (Crear todas las tablas)

-- 2. Luego ejecutar database_functions.sql
-- (Crear funciones adicionales)
```

### 2. **Configurar Variables de Entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nxfbtwaypegiywbfbnbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZmJ0d2F5cGVnaXl3YmZibmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTI2MDEsImV4cCI6MjA2ODE4ODYwMX0.TSHtt23fw2NYZ9NYpdUMdZsy-o0DN0jkWeT_srtCtHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZmJ0d2F5cGVnaXl3YmZibmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYxMjYwMSwiZXhwIjoyMDY4MTg4NjAxfQ.N2HJUbKQKdhgMWtnp-6kp-F02OPW0A02SKYFdkRWWII
SUPABASE_JWT_SECRET=0LYCJRd5VdQLz+vTkVl8iaV7nXTmyDzAHBMtutkr9URY01Yb7FmylmR2mfV1cBSsCAB+PQcOhExToD/SR11UYw==

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. **Instalar y Ejecutar**

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# El proyecto estará disponible en http://localhost:3000
```

---

## 🔐 Configuración de Usuarios

### **Crear Usuario Administrador**

En Supabase, ve a **Authentication > Users** y crea un nuevo usuario:

1. **Email**: `admin@tuempresa.com` (o el que prefieras)
2. **Password**: `tu_password_seguro`
3. **Confirma el email** en Supabase

Luego, en el **SQL Editor**, ejecuta:

```sql
-- Insertar el usuario administrador en la tabla usuarios
INSERT INTO usuarios (id, email, nombre, rol, activo)
VALUES (
  'ID_DEL_USUARIO_DE_SUPABASE_AUTH', -- Copiar el ID de Authentication
  'admin@tuempresa.com',
  'Administrador',
  'creador',
  true
)
ON CONFLICT (email) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;
```

### **Crear Trabajadores**

Los trabajadores se pueden crear desde el panel de administración o directamente en SQL:

```sql
-- 1. Crear usuario en Authentication de Supabase
-- 2. Luego ejecutar:
INSERT INTO usuarios (id, email, nombre, rol, activo)
VALUES (
  'ID_DEL_TRABAJADOR',
  'trabajador@email.com',
  'Nombre del Trabajador',
  'trabajador',
  true
);
```

---

## 🚀 Despliegue en Vercel

### **1. Conectar Repositorio**

1. Sube el código a GitHub
2. Ve a [Vercel](https://vercel.com)
3. Conecta tu repositorio

### **2. Configurar Variables de Entorno en Vercel**

En el proyecto de Vercel, ve a **Settings > Environment Variables** y agrega:

```
NEXT_PUBLIC_SUPABASE_URL = https://nxfbtwaypegiywbfbnbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET = 0LYCJRd5VdQLz+vTkVl8iaV7nXTmyDzAHBMtutkr9URY01Yb7...
NEXT_PUBLIC_APP_URL = https://tu-dominio.vercel.app
```

### **3. Configurar Dominio en Supabase**

En tu proyecto de Supabase:
1. Ve a **Authentication > Settings**
2. En **Site URL**, agrega: `https://tu-dominio.vercel.app`
3. En **Redirect URLs**, agrega: `https://tu-dominio.vercel.app/**`

---

## 📊 Funcionalidades del Sistema

### **Para Administradores (Creadores):**
- 📈 **Dashboard completo** con estadísticas en tiempo real
- 👥 **Gestión de trabajadores** y asignación de roles
- 💰 **Control de días trabajados** y asignación de pagos
- 🔧 **Gestión de rentas** de herramientas con temporizadores
- 📱 **Control de IMEI** con verificación OSIPTEL
- 🐛 **Monitoreo de bugs Samsung** con rankings
- 📊 **Reportes detallados** por usuario y período

### **Para Trabajadores:**
- 🏠 **Dashboard personal** con su actividad
- 📅 **Visualización de días trabajados** y pagos pendientes
- 🔧 **Gestión de sus rentas** asignadas
- 📱 **Registro de IMEI** procesados
- 🐛 **Registro diario de bugs** con cálculo automático
- ⏰ **Historial de ingresos** al sistema

---

## 🔧 Estructura Técnica

```
src/
├── app/
│   ├── dashboard/
│   │   ├── admin/          # Páginas del administrador
│   │   │   ├── page.tsx    # Dashboard principal
│   │   │   ├── rentas/     # Gestión de rentas
│   │   │   ├── imei/       # Control de IMEI
│   │   │   └── bugs/       # Bugs Samsung
│   │   ├── trabajador/     # Páginas del trabajador
│   │   └── layout.tsx      # Layout del dashboard
│   ├── layout.tsx          # Layout principal
│   └── page.tsx           # Página de login
├── components/
│   ├── auth/              # Componentes de autenticación
│   └── layout/            # Sidebar y layout
├── contexts/
│   └── AuthContext.tsx    # Gestión de autenticación
├── lib/
│   └── supabase.ts        # Configuración de Supabase
└── types/
    └── supabase.ts        # Tipos de TypeScript
```

---

## 📝 Uso del Sistema

### **1. Primer Login**
1. Accede con el usuario administrador creado
2. El sistema registrará automáticamente el ingreso
3. Serás redirigido al dashboard de administrador

### **2. Gestión de Rentas**
- **Crear renta**: Especifica herramienta, duración y costo
- **Monitoreo**: El sistema notifica cuando vencen
- **Control**: Activa/desactiva rentas según necesidad

### **3. Procesamiento de IMEI**
- **Registro**: Pega la información completa del dispositivo
- **Extracción**: El sistema extrae automáticamente los datos
- **Verificación**: Link directo a OSIPTEL para verificar

### **4. Bugs Samsung**
- **Registro diario**: Cantidad de bugs procesados
- **Cálculo automático**: Precio por bug × cantidad
- **Rankings**: Comparación entre trabajadores

---

## 🎯 Mantenimiento

### **Tareas Automáticas**
- ✅ Registro de ingresos al hacer login
- ✅ Cálculo automático de ganancias por bugs
- ✅ Verificación de rentas vencidas
- ✅ Actualización de estadísticas en tiempo real

### **Tareas Manuales**
- 💰 **Asignación de pagos** por días trabajados
- 🔧 **Cambio de contraseñas** de herramientas
- 📱 **Verificación en OSIPTEL** de IMEIs procesados

---

## 🆘 Soporte

### **Problemas Comunes:**

1. **Error de conexión a base de datos**
   - Verificar variables de entorno
   - Confirmar URLs de Supabase

2. **Usuario no puede hacer login**
   - Verificar que existe en Authentication
   - Confirmar que está en la tabla usuarios

3. **Datos no se actualizan**
   - Verificar permisos RLS en Supabase
   - Confirmar que las funciones SQL están creadas

---

## 🎉 ¡Sistema Completamente Funcional!

El **Sistema de Rentas** está **100% operativo** y listo para producción con:

- ✅ **Base de datos completa** con 6 tablas y funciones
- ✅ **Autenticación robusta** con roles diferenciados  
- ✅ **Interface moderna** con dashboards intuitivos
- ✅ **Módulos completos** para todos los requerimientos
- ✅ **Despliegue automático** en Vercel
- ✅ **Escalabilidad** para crecimiento futuro

**¡Ya puedes comenzar a usar el sistema!** 🚀 