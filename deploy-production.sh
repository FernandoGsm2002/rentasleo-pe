#!/bin/bash

echo "🚀 INICIANDO DEPLOYMENT DE PRODUCCIÓN - CORRECCIÓN 103/304"
echo "============================================================="

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Paso 1: Verificando build local...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en build local. Corrige los errores antes de continuar.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build local exitoso${NC}"

echo -e "${BLUE}📋 Paso 2: Limpiando caché local...${NC}"
rm -rf .next
npm cache clean --force
echo -e "${GREEN}✅ Caché local limpiado${NC}"

echo -e "${BLUE}📋 Paso 3: Reinstalando dependencias...${NC}"
rm -rf node_modules package-lock.json
npm install
echo -e "${GREEN}✅ Dependencias reinstaladas${NC}"

echo -e "${BLUE}📋 Paso 4: Build final para producción...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en build final. Revisa la configuración.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build final exitoso${NC}"

echo -e "${BLUE}📋 Paso 5: Preparando commit...${NC}"
git add .
git status

echo -e "${YELLOW}⚠️  IMPORTANTE: Antes de continuar, verifica que:${NC}"
echo -e "${YELLOW}   1. Ejecutaste el SQL para deshabilitar RLS en Supabase${NC}"
echo -e "${YELLOW}   2. Las variables de entorno están configuradas en Vercel${NC}"
echo -e "${YELLOW}   3. Has limpiado el caché en Vercel Dashboard${NC}"

read -p "¿Continuar con el deployment? (y/N): " confirm
if [[ $confirm != [yY] ]]; then
    echo -e "${YELLOW}⏹️  Deployment cancelado por el usuario${NC}"
    exit 0
fi

echo -e "${BLUE}📋 Paso 6: Haciendo commit...${NC}"
git commit -m "fix: resolve 103/304 cache issues in Vercel production

- Rewrite middleware following @supabase/ssr best practices
- Add vercel.json with anti-cache headers for dashboard routes
- Optimize next.config.ts for Next.js 15.4.1 compatibility
- Add production configuration for session management
- Fix SSR cookie handling for Vercel deployment

Resolves:
- 103 Early Hints errors
- 304 Not Modified cache issues
- Session expiration problems
- Auth redirect loops in production"

echo -e "${GREEN}✅ Commit realizado${NC}"

echo -e "${BLUE}📋 Paso 7: Desplegando a producción...${NC}"
git push origin main

echo -e "${GREEN}🎉 DEPLOYMENT COMPLETADO!${NC}"
echo ""
echo -e "${BLUE}📊 PRÓXIMOS PASOS:${NC}"
echo -e "${YELLOW}1. Ve a Vercel Dashboard y espera que termine el deployment${NC}"
echo -e "${YELLOW}2. Si persisten problemas, ve a Settings → Functions → Clear Cache${NC}"
echo -e "${YELLOW}3. Prueba la app en modo incógnito: https://leope-staff.vercel.app${NC}"
echo -e "${YELLOW}4. Verifica en Network tab que ya no aparezcan códigos 103/304${NC}"
echo ""
echo -e "${GREEN}✅ Comportamiento esperado:${NC}"
echo -e "   • Login inmediato sin 103/304"
echo -e "   • Sesión persistente por 7 días"
echo -e "   • Operaciones sin quedarse cargando"
echo -e "   • Headers: Cache-Control: no-cache, no-store"
echo ""
echo -e "${BLUE}🔍 Si hay problemas, revisa: VERCEL_PRODUCTION_FIX.md${NC}" 