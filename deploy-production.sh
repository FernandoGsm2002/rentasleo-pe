#!/bin/bash

# 🚀 Script de Deployment Optimizado - Fix Errores 103/307
# Resuelve problemas de middleware, cache y sesiones en Vercel

echo "🚀 INICIANDO DEPLOYMENT OPTIMIZADO PARA ERRORES 103/307..."
echo "========================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# PASO 1: Validaciones previas
echo ""
log_info "PASO 1: Validaciones previas..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    log_error "No se encontró package.json. ¿Estás en el directorio raíz del proyecto?"
    exit 1
fi

# Verificar archivos críticos corregidos
if [ ! -f "src/middleware.ts" ]; then
    log_error "No se encontró src/middleware.ts"
    exit 1
fi

if [ ! -f "vercel.json" ]; then
    log_error "No se encontró vercel.json"
    exit 1
fi

if [ ! -f "next.config.ts" ]; then
    log_error "No se encontró next.config.ts"
    exit 1
fi

log_success "Archivos principales verificados"

# PASO 2: Validar configuración JSON
echo ""
log_info "PASO 2: Validando configuración JSON..."

# Validar vercel.json
if node -p "JSON.parse(require('fs').readFileSync('vercel.json', 'utf8'))" > /dev/null 2>&1; then
    log_success "vercel.json es válido"
else
    log_error "vercel.json tiene errores de sintaxis"
    exit 1
fi

# PASO 3: Limpiar dependencias y rebuild
echo ""
log_info "PASO 3: Limpiando y reconstruyendo..."

# Limpiar .next y node_modules si existen
if [ -d ".next" ]; then
    rm -rf .next
    log_success "Directorio .next eliminado"
fi

# Instalar dependencias
log_info "Instalando dependencias..."
npm install --silent

# PASO 4: Build y validación
echo ""
log_info "PASO 4: Construyendo aplicación..."

if npm run build; then
    log_success "Build completado exitosamente"
else
    log_error "Error en el build. Revisa los logs arriba."
    exit 1
fi

# PASO 5: Verificar variables de entorno críticas
echo ""
log_info "PASO 5: Verificando variables de entorno..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    log_warning "NEXT_PUBLIC_SUPABASE_URL no está definida"
else
    log_success "NEXT_PUBLIC_SUPABASE_URL configurada"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    log_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida"
else
    log_success "NEXT_PUBLIC_SUPABASE_ANON_KEY configurada"
fi

# PASO 6: Verificar cambios de Git
echo ""
log_info "PASO 6: Preparando commit optimizado..."

# Verificar estado de Git
if [ -z "$(git status --porcelain)" ]; then
    log_warning "No hay cambios para commit"
    read -p "¿Quieres forzar un re-deployment? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git commit --allow-empty -m "force: re-deploy to fix 103/307 errors"
        log_success "Commit vacío creado para forzar deployment"
    else
        log_info "Cancelando deployment"
        exit 0
    fi
else
    # Agregar archivos al staging
    git add .
    
    # Commit con mensaje descriptivo
    git commit -m "fix: resolver errores 103/307 - optimizar middleware, headers y SSR

    - ✅ Middleware reescrito para evitar bucles de redirección
    - ✅ Headers anti-cache optimizados para Vercel
    - ✅ Configuración SSR mejorada para Next.js 15.4.1
    - ✅ Cookies de sesión configuradas para 7 días
    - ✅ Bypass inteligente para archivos estáticos
    - ✅ Prevención de Early Hints (103) y redirect loops (307)
    
    Resolves: #103-early-hints #307-redirect-loops #session-persistence"
    
    log_success "Cambios commitados con mensaje descriptivo"
fi

# PASO 7: Push optimizado
echo ""
log_info "PASO 7: Pushing a repositorio..."

if git push origin main; then
    log_success "Push completado exitosamente"
else
    log_error "Error en el push"
    exit 1
fi

# PASO 8: Información post-deployment
echo ""
log_info "PASO 8: Información post-deployment..."

echo ""
echo "🎯 DEPLOYMENT INICIADO - Sigue estos pasos en Vercel:"
echo "================================================="
echo ""
echo "1. 🌐 Ve a Vercel Dashboard → Tu Proyecto"
echo "2. 🔄 Monitorea el deployment en tiempo real en la pestaña 'Deployments'"
echo "3. 🧹 Mientras se deploya, ve a Settings → Functions → 'Purge Everything'"
echo "4. 🌍 Settings → Domains → 'Refresh DNS'"
echo ""

echo "🔍 VERIFICACIONES POST-DEPLOYMENT:"
echo "================================="
echo ""
echo "✅ Test 1 - Response headers:"
echo "   curl -I https://leope-staff.vercel.app/dashboard"
echo "   Debe retornar: HTTP/2 200"
echo ""
echo "✅ Test 2 - Homepage redirect:"
echo "   curl -I https://leope-staff.vercel.app/?redirect=%2Fdashboard"
echo "   Debe retornar: HTTP/2 307 (redirección normal)"
echo ""
echo "✅ Test 3 - Dashboard directo:"
echo "   curl -I https://leope-staff.vercel.app/dashboard/admin/rentas"
echo "   Debe retornar: HTTP/2 200"
echo ""

echo "📊 CÓDIGOS DE RESPUESTA ESPERADOS:"
echo "================================="
echo "✅ 200 OK      - Dashboard y rutas autenticadas"
echo "✅ 307 Redirect - Redirecciones normales de auth"
echo "❌ 103 Early Hints - DEBE DESAPARECER"
echo "❌ 304 Not Modified - DEBE DESAPARECER"
echo ""

echo "🚨 SI HAY PROBLEMAS:"
echo "==================="
echo "1. Espera 2-3 minutos para que el cache se propague"
echo "2. Limpia cache del navegador (Ctrl+Shift+R)"
echo "3. Prueba en ventana incógnito"
echo "4. Verifica que las variables de entorno estén en Vercel"
echo ""

echo "📝 LOGS A MONITOREAR EN VERCEL:"
echo "==============================="
echo "✅ 'Build completed successfully'"
echo "✅ 'Functions deployed'"
echo "✅ 'Middleware: path=/dashboard, user=email@domain.com'"
echo "❌ 'Early Hints not supported' (debe desaparecer)"
echo "❌ 'Redirect loop detected' (debe desaparecer)"
echo ""

log_success "DEPLOYMENT SCRIPT COMPLETADO"
echo ""
echo "🚀 Tu aplicación se está deployando con todas las correcciones para errores 103/307"
echo "🔗 Monitorea el progreso en: https://vercel.com/dashboard"
echo ""
echo "⏱️  Tiempo estimado de deployment: 2-5 minutos"
echo "🎉 Después del deployment, tendrás sesiones persistentes de 7 días y sin errores de cache" 