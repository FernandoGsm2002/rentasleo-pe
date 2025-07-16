# Sistema de Rentas y Control de Trabajadores

Sistema completo de gestión para control de trabajadores, rentas de herramientas, registros IMEI y bugs Samsung.

## 🚀 Características

- **Autenticación completa** con roles (Creador/Trabajador)
- **Registro automático de ingresos** al hacer login
- **Dashboard diferenciado** según rol de usuario
- **Control de días trabajados** y pagos
- **Gestión de rentas** de herramientas (UnlockTool, Pandora, DFT Pro, etc.)
- **Módulo IMEI justificado** con verificación OSIPTEL
- **Contador de bugs Samsung** con cálculos automáticos
- **Diseño responsive** con TailwindCSS

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 + TypeScript + TailwindCSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Despliegue**: Vercel
- **Validación**: Zod + React Hook Form
- **UI**: Lucide React Icons

## 📋 Configuración Inicial

### 1. Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://nxfbtwaypegiywbfbnbn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZmJ0d2F5cGVnaXl3YmZibmJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTI2MDEsImV4cCI6MjA2ODE4ODYwMX0.TSHtt23fw2NYZ9NYpdUMdZsy-o0DN0jkWeT_srtCtHM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54ZmJ0d2F5cGVnaXl3YmZibmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjYxMjYwMSwiZXhwIjoyMDY4MTg4NjAxfQ.N2HJUbKQKdhgMWtnp-6kp-F02OPW0A02SKYFdkRWWII
SUPABASE_JWT_SECRET=0LYCJRd5VdQLz+vTkVl8iaV7nXTmyDzAHBMtutkr9URY01Yb7FmylmR2mfV1cBSsCAB+PQcOhExToD/SR11UYw==
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Base de Datos

Ejecuta el archivo `database_schema.sql` en tu proyecto de Supabase para crear todas las tablas necesarias:

- ✅ `usuarios` - Gestión de usuarios y roles
- ✅ `ingresos` - Registro de logins
- ✅ `dias_trabajados` - Control de días y pagos
- ✅ `rentas_herramientas` - Alquiler de herramientas
- ✅ `imei_justificado` - Registro de dispositivos
- ✅ `bugs_samsung` - Contador de bugs procesados

### 3. Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Compilar para producción
npm run build

# Iniciar en producción
npm start
```

## 🏗️ Arquitectura del Proyecto

```
src/
├── app/                    # App Router de Next.js
│   ├── layout.tsx         # Layout principal con AuthProvider
│   ├── page.tsx           # Página de login/redirección
│   └── dashboard/         # Rutas protegidas del dashboard
├── components/            # Componentes reutilizables
│   └── auth/             # Componentes de autenticación
├── contexts/             # Contextos de React
│   └── AuthContext.tsx   # Gestión del estado de autenticación
├── lib/                  # Librerías y utilidades
│   └── supabase.ts       # Configuración de Supabase
├── types/                # Tipos de TypeScript
│   └── supabase.ts       # Tipos de la base de datos
└── middleware.ts         # Middleware de protección de rutas
```

## 🔐 Sistema de Autenticación

- **Creador**: Acceso completo al sistema, puede ver todos los ingresos y gestionar trabajadores
- **Trabajador**: Vista limitada, solo puede ver sus propios datos y registros

## 📊 Funcionalidades Implementadas

### ✅ Completado
1. **Base de datos PostgreSQL** con esquema completo
2. **Proyecto Next.js** con TypeScript configurado
3. **Variables de entorno** de Supabase configuradas
4. **Sistema de autenticación** con roles y protección de rutas

### 🔄 En Progreso
5. **Sidebar y layout principal** - Próximo paso

### ⏳ Pendiente
6. Implementar sistema de marcado de ingresos
7. Crear módulo de rentas de herramientas
8. Implementar apartado IMEI justificado
9. Crear módulo BUGS SAMSUNG con conteo y cálculos
10. Implementar dashboard del creador y trabajadores

## 🚀 Despliegue en Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno en Vercel
3. Despliega automáticamente

## 📝 Próximos Pasos

1. **Crear sidebar** con navegación para las diferentes secciones
2. **Implementar dashboards** diferenciados por rol
3. **Desarrollar módulos** de rentas, IMEI y bugs Samsung
4. **Agregar notificaciones** y validaciones avanzadas

## 🤝 Contribución

Este es un proyecto específico para gestión de rentas y trabajadores. Para cambios o mejoras, contacta al administrador del sistema.

---

**Desarrollado con ❤️ usando Next.js, Supabase y TypeScript**
