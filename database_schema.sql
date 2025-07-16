-- Schema para Sistema de Rentas y Control de Trabajadores
-- Base de datos PostgreSQL para Supabase

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de usuarios con roles
CREATE TABLE usuarios (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('creador', 'trabajador')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de ingresos (registro de logins)
CREATE TABLE ingresos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_ingreso TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de días trabajados y pagos
CREATE TABLE dias_trabajados (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  horas_trabajadas DECIMAL(4,2) DEFAULT 0,
  monto_asignado DECIMAL(10,2) DEFAULT 0,
  pagado BOOLEAN DEFAULT FALSE,
  fecha_pago DATE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, fecha)
);

-- Tabla de rentas de herramientas
CREATE TABLE rentas_herramientas (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre_herramienta VARCHAR(100) NOT NULL,
  tipo_herramienta VARCHAR(50) NOT NULL, -- 'unlocktool', 'pandora', 'dft_pro', etc.
  usuario_login VARCHAR(100) NOT NULL,
  password_actual VARCHAR(100) NOT NULL,
  duracion_horas INTEGER NOT NULL, -- 6, 24, 48, etc.
  fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
  activa BOOLEAN DEFAULT TRUE,
  costo DECIMAL(10,2) NOT NULL,
  usuario_responsable_id UUID REFERENCES usuarios(id),
  notificacion_enviada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de IMEI justificado
CREATE TABLE imei_justificado (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  imei VARCHAR(20) NOT NULL,
  modelo_descripcion TEXT NOT NULL,
  modelo_nombre VARCHAR(100) NOT NULL,
  modelo_mercado VARCHAR(100),
  codigo_modelo VARCHAR(50),
  memoria VARCHAR(50),
  serial VARCHAR(100),
  estado_osiptel VARCHAR(20) CHECK (estado_osiptel IN ('apto', 'no_apto', 'pendiente')),
  fecha_verificacion DATE,
  monto_cobrado DECIMAL(10,2) DEFAULT 0,
  usuario_procesado_id UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de bugs Samsung
CREATE TABLE bugs_samsung (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  cantidad_bugs INTEGER NOT NULL DEFAULT 0,
  precio_por_bug DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  total_ganado DECIMAL(10,2) GENERATED ALWAYS AS (cantidad_bugs * precio_por_bug) STORED,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, fecha)
);

-- Comentarios en las tablas
COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema con roles de creador y trabajador';
COMMENT ON TABLE ingresos IS 'Registro de todos los logins de usuarios';
COMMENT ON TABLE dias_trabajados IS 'Control de días trabajados y pagos por usuario';
COMMENT ON TABLE rentas_herramientas IS 'Control de alquiler de herramientas de desbloqueo';
COMMENT ON TABLE imei_justificado IS 'Registro de dispositivos procesados con verificación OSIPTEL';
COMMENT ON TABLE bugs_samsung IS 'Conteo diario de bugs Samsung procesados por usuario'; 