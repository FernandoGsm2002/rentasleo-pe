// Utilidad para obtener la ruta correcta según el rol
export const getDashboardPath = (rol: string): string => {
  switch (rol) {
    case 'creador':
      return '/dashboard/admin'
    case 'trabajador':
      return '/dashboard/trabajador'
    default:
      return '/dashboard/trabajador'
  }
} 