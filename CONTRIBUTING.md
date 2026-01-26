# Contributing to Reporte Ciudadano Coatepec

¡Gracias por tu interés en contribuir! Este proyecto está abierto a mejoras que beneficien a los ciudadanos de Coatepec y otros municipios.

## 🤝 Cómo Contribuir

### Reportar Bugs

1. Verifica que el bug no haya sido reportado previamente en [Issues](https://github.com/municipio-coatepec/reporte-ciudadano/issues)
2. Abre un nuevo issue con:
   - Título descriptivo
   - Pasos para reproducir el bug
   - Comportamiento esperado vs actual
   - Screenshots (si aplica)
   - Información del navegador/dispositivo

### Sugerir Features

1. Abre un issue con el tag `enhancement`
2. Describe claramente el problema que resuelve
3. Propón una solución o alternativas
4. Considera el impacto en costos (debe mantenerse $0/mes)

### Pull Requests

1. **Fork** el repositorio
2. **Clone** tu fork localmente
3. **Crea una rama** para tu feature:

   ```bash
   git checkout -b feature/nombre-descriptivo
   ```

4. **Realiza tus cambios** siguiendo las guías de estilo
5. **Commit** con mensajes claros:

   ```bash
   git commit -m "feat: agregar filtro de categorías en admin"
   ```

6. **Push** a tu fork:

   ```bash
   git push origin feature/nombre-descriptivo
   ```

7. **Abre un Pull Request** contra la rama `main`

## 📋 Guías de Estilo

### Código TypeScript/React

- Usar TypeScript estricto (no `any`)
- Componentes funcionales con hooks
- Props tipadas con interfaces
- Nombres descriptivos en español para variables de negocio

```typescript
// ✅ Bien
interface ReporteProps {
  categoria: string;
  descripcion: string;
}

// ❌ Mal
const data: any = {};
```

### Commits

Seguir [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Formato, punto y coma faltante, etc.
- `refactor:` Refactorización de código
- `test:` Agregar tests
- `chore:` Mantenimiento

```bash
feat: agregar exportación CSV en admin panel
fix: corregir validación de ubicación GPS
docs: actualizar guía de deployment
```

### Formateo

```bash
# Formatear código antes de commit
pnpm format

# Verificar linting
pnpm lint

# Fix automático
pnpm lint:fix
```

## 🧪 Testing

Antes de enviar tu PR:

1. **Build local**:

   ```bash
   pnpm build
   ```

2. **Verificar TypeScript**:

   ```bash
   pnpm lint
   ```

3. **Probar en development**:

   ```bash
   pnpm dev
   ```

4. **Probar flujo completo**:
   - Crear reporte
   - Ver en admin
   - Cambiar status
   - Verificar responsive

## 📐 Arquitectura

### Principios

1. **Zero-Cost First**: Nuevas features no deben aumentar costos base
2. **Mobile-First**: Optimizar para conexiones lentas
3. **Accessibility**: Mantener WCAG compliance
4. **Type Safety**: No usar `any`, validar con Zod
5. **Simplicidad**: No sobre-ingeniería

### Estructura de Carpetas

```
src/
├── app/              # Pages (Next.js App Router)
├── components/       # Componentes React
│   ├── forms/       # Formularios específicos
│   └── ui/          # shadcn/ui components
├── hooks/           # Custom React hooks
├── lib/             # Utilidades y configuración
└── schemas/         # Validación Zod
```

### Estado y Data Fetching

- **Formularios**: React Hook Form + Zod
- **Data real-time**: Firebase onSnapshot
- **Estado global**: Evitar si es posible, usar props
- **Notificaciones**: useToast hook

## 🎨 UI/UX Guidelines

### Componentes

- Usar shadcn/ui cuando sea posible
- Mantener consistencia con colores municipales
- Responsive: mobile-first approach
- Loading states en todas las async operations

### Accesibilidad

- Labels semánticos en formularios
- Alt text en imágenes
- Contraste de colores WCAG AA
- Navegación por teclado funcional

### Textos

- Usar español (es-MX)
- Mensajes de error claros y accionables
- Evitar jerga técnica para usuarios

## 🔒 Seguridad

### Datos Sensibles

- NUNCA commitear `.env` files
- No exponer API keys en código cliente
- Validar datos en cliente Y servidor

### Firebase

- Mantener reglas de Firestore restrictivas
- Validar permisos antes de updates
- Auditar cambios a security rules

## 📦 Dependencies

### Agregar Nueva Dependencia

1. Justificar necesidad en PR
2. Verificar licencia compatible (MIT preferido)
3. Verificar tamaño del bundle
4. Documentar en README

```bash
# Verificar impacto en bundle
pnpm build
# Revisar .next/analyze/
```

## 🚀 Release Process

1. Merge a `main` activa deployment automático en Vercel
2. Tags semánticos: `v1.0.0`, `v1.1.0`, etc.
3. Changelog actualizado

## ❓ Preguntas

- Abrir un issue con el tag `question`
- Contactar mantenedores del proyecto
- Revisar documentación existente

## 📄 Licencia

Al contribuir, aceptas que tus contribuciones se licenciarán bajo la licencia MIT del proyecto.

---

**¡Gracias por contribuir a mejorar los servicios ciudadanos de Coatepec! 🏛️**
