# Reporte Ciudadano Coatepec

Plataforma oficial para el levantamiento de reportes ciudadanos en Coatepec, Veracruz, México. Los ciudadanos pueden reportar problemas de infraestructura urbana y servicios públicos con evidencia fotográfica y ubicación GPS.

## 🚀 Características

- **Reportes Ciudadanos**: Formulario intuitivo para levantar reportes con foto y ubicación
- **Categorías**: Baches, alumbrado público, fugas de agua, basura, protección civil, bienestar animal
- **Panel de Administración**: Dashboard en tiempo real para gestionar reportes
- **Optimización de Imágenes**: Compresión automática a WebP (33x reducción de tamaño)
- **Arquitectura Zero-Cost**: Diseñado para operar con $0/mes hasta 50,000 reportes
- **Mobile-First**: Optimizado para redes 4G inestables
- **PWA (Progressive Web App)**: Instalable en pantalla de inicio, funciona offline
- **Detección de Duplicados**: Previene reportes duplicados usando geohashing
- **Validación de Área de Servicio**: Solo acepta reportes dentro del municipio (15km)
- **Accesibilidad**: WCAG compliant usando shadcn/ui

## 🛠 Tech Stack

### Frontend

- **Next.js 14** (App Router, TypeScript)
- **React Hook Form** + **Zod** (validación)
- **Tailwind CSS** + **shadcn/ui** (componentes)
- **Vercel** (hosting gratuito)

### Backend

- **Firebase Firestore** (base de datos NoSQL)
- **Firebase Auth** (autenticación - opcional)
- **Backblaze B2** (almacenamiento de imágenes)
- **Cloudflare CDN** (entrega de contenido)

### Procesamiento

- **browser-image-compression** (compresión WebP en cliente)
- **AWS SDK S3** (integración con Backblaze B2)
- **date-fns** (manejo de fechas con locale español)
- **ngeohash** (indexación geoespacial para duplicados)
- **next-pwa** (Progressive Web App con service worker)

## 📋 Prerequisitos

- Node.js 18+ y pnpm
- Cuenta Firebase (Spark Plan - gratuito)
- Cuenta Backblaze B2 (10GB gratis)
- Cuenta Vercel (Hobby tier - gratuito)

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/reporte-ciudadano.git
cd reporte-ciudadano
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Habilitar Firestore Database
3. Habilitar Authentication (opcional - para admin)
4. Copiar credenciales del proyecto

### 4. Configurar Backblaze B2

1. Crear cuenta en [Backblaze B2](https://www.backblaze.com/b2)
2. Crear un nuevo bucket (puede ser privado - no requiere pago adicional)
3. Generar Application Key con permisos de lectura/escritura
4. Las credenciales se mantienen en el servidor (no se exponen al cliente)

### 5. Configurar Cloudflare CDN (Opcional pero recomendado)

1. Agregar dominio personalizado a Cloudflare
2. Configurar Bandwidth Alliance con Backblaze
3. Usar URL de Cloudflare como `NEXT_PUBLIC_CDN_URL`

### 6. Variables de entorno

Copiar `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completar las variables:

```env
# Firebase (Client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id

# Firebase Admin (Server-side - para detección de duplicados)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Backblaze B2 (Server-side only - NO usar NEXT_PUBLIC_)
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
B2_REGION=us-west-004
B2_ACCESS_KEY_ID=tu-key-id
B2_SECRET_ACCESS_KEY=tu-secret-key
B2_BUCKET_NAME=tu-bucket-name
```

### 7. Desplegar Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 8. Ejecutar en desarrollo

```bash
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## 🚢 Deployment

### Vercel (Recomendado)

1. Conectar repositorio en [Vercel](https://vercel.com)
2. Configurar variables de entorno en Vercel Dashboard
3. Desplegar automáticamente en cada push a `main`

```bash
# O usar Vercel CLI
pnpm vercel
```

## 📱 Rutas

### Páginas

- `/` - Formulario de reportes ciudadanos
- `/admin` - Panel de administración (requiere autenticación en producción)

### API Routes

- `/api/upload` - POST: Subir imagen a Backblaze B2
- `/api/image` - GET: Obtener URL presignada para imagen
- `/api/check-duplicate` - POST: Verificar reportes duplicados cercanos

### PWA

La aplicación es instalable como PWA. En dispositivos móviles:

1. Abrir la app en el navegador
2. Menú del navegador → "Agregar a pantalla de inicio"
3. La app funcionará en modo standalone (sin barra de navegador)

## 🔒 Seguridad

### Firestore Rules

Las reglas de seguridad están en `firestore.rules`:

- **Crear reportes**: Público (permite reportes anónimos)
- **Leer reportes**: Público (dashboard y visualización)
- **Actualizar reportes**: Solo usuarios autenticados
- **Eliminar reportes**: Solo usuarios autenticados

⚠️ **Importante**: En producción, restringir `/admin` a usuarios admin usando Firebase Auth.

### Backblaze B2

- Las credenciales B2 se mantienen exclusivamente en el servidor
- Los uploads pasan por `/api/upload` (nunca directamente desde el cliente)
- Las imágenes se acceden via URLs presignadas con expiración de 7 días
- NUNCA usar variables `NEXT_PUBLIC_` para credenciales de B2

## 🎨 Customización

### Colores del municipio

Editar en `tailwind.config.ts`:

```typescript
colors: {
  'municipality-green': '#1B4332',   // Verde institucional
  'municipality-coffee': '#4E342E',  // Café secundario
  'status-error': '#E63946',         // Rojo para errores
  'status-pending': '#E9C46A',       // Dorado para pendientes
  'status-resolved': '#2A9D8F',      // Verde azulado para resueltos
}
```

### Categorías de reportes

Editar en `src/schemas/reportSchema.ts`:

```typescript
category: z.enum([
  'pothole',
  'lighting',
  'water_leak',
  'garbage',
  'civil_protection',
  'animal_welfare',
  // Agregar más categorías aquí
]),
```

## 📊 Estructura del Proyecto

```
src/
├── app/
│   ├── admin/              # Panel de administración
│   ├── api/
│   │   ├── upload/         # API para subir imágenes a B2
│   │   ├── image/          # API para generar URLs presignadas
│   │   └── check-duplicate/ # API para detectar duplicados
│   ├── layout.tsx          # Layout raíz con metadata SEO + PWA
│   ├── page.tsx            # Página principal (formulario)
│   ├── error.tsx           # Error boundary
│   ├── not-found.tsx       # Página 404
│   └── globals.css         # Estilos globales
├── components/
│   ├── forms/
│   │   └── ReportForm.tsx  # Formulario de reportes
│   └── ui/                 # Componentes shadcn/ui
├── hooks/
│   ├── useReportUpload.ts  # Lógica de upload
│   ├── useDuplicateCheck.ts # Verificación de duplicados
│   └── useToast.ts         # Sistema de notificaciones
├── lib/
│   ├── firebase.ts         # Configuración Firebase (cliente)
│   ├── firebase-admin.ts   # Configuración Firebase Admin (servidor)
│   ├── b2.ts               # Cliente B2 (servidor)
│   ├── dates.ts            # Utilidades de fecha (date-fns)
│   ├── location.ts         # Geohash y validación de ubicación
│   └── utils.ts            # Utilidades generales
└── schemas/
    └── reportSchema.ts     # Validación Zod
public/
├── site.webmanifest        # Manifest PWA
├── icon-192.png            # Icono PWA 192x192
├── icon-512.png            # Icono PWA 512x512
├── apple-touch-icon.png    # Icono iOS
└── sw.js                   # Service worker (generado)
```

## 🧪 Scripts

```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # Build de producción (genera service worker)
pnpm start        # Servidor de producción
pnpm lint         # Ejecutar ESLint
pnpm lint:fix     # Fix automático de ESLint
pnpm format       # Formatear con Prettier

# Utilidades
node scripts/generate-icons.mjs  # Regenerar iconos PWA
```

## 📚 Documentación

- [Guía de inicio rápido (10 minutos)](./QUICKSTART.md)
- [Guía de contribución](./CONTRIBUTING.md)
- [Mejoras implementadas](./IMPROVEMENTS.md)
- [Configuración del proyecto](./docs/CONFIGURATION.md)
- [Mejoras de type safety](./docs/TYPE_SAFETY_IMPROVEMENTS.md)
- [Best practices de React](./docs/REACT_BEST_PRACTICES.md)
- [Manejo de fechas y horas](./docs/DATETIME_HANDLING.md)
- [Decisiones arquitectónicas](./docs/adr/)

## 📈 Costos Estimados

### Hasta 50,000 reportes/mes

| Servicio           | Plan      | Costo                          |
| ------------------ | --------- | ------------------------------ |
| Vercel             | Hobby     | $0                             |
| Firebase Firestore | Spark     | $0 (50k reads, 20k writes/día) |
| Backblaze B2       | Free Tier | $0 (10GB storage)              |
| Cloudflare         | Free      | $0 (bandwidth ilimitado)       |
| **Total**          |           | **$0/mes**                     |

### Escalamiento (>50k reportes/mes)

- Firebase Blaze Plan: ~$0.36 por 100k lecturas adicionales
- Backblaze B2: $0.005/GB/mes después de 10GB
- Vercel Pro: $20/mes (opcional, para más builds)

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🏛 Acerca de

Desarrollado para el Municipio de Coatepec, Veracruz, México. Diseñado para ser replicable en otros municipios del estado.

## 📞 Soporte

Para reportar problemas o sugerencias, abrir un issue en GitHub.

---

**Hecho con ❤️ para Coatepec, Veracruz**
