# ADR 001: Zero-Cost Serverless Architecture for "Coatepec - Citizen Report"

## Status

Accepted

## Context

The municipality of **Coatepec, Veracruz** requires a citizen reporting application ("Coatepec - Reporte ciudadano") to track urban infrastructure issues such as potholes, broken streetlights, and water leaks.

The project faces the following constraints:

1.  **Budget:** The solution must minimize operational costs, targeting **$0 USD/month** during the initial adoption phase (approx. first 50,000 reports).
2.  **Connectivity:** Users will likely access the app via unstable 4G mobile networks; the app must be lightweight and performant.
3.  **Scalability:** The architecture must be replicable for other municipalities in Veracruz without major refactoring.
4.  **Storage:** High-resolution photographic evidence is required for every report, which traditionally incurs high storage and egress fees.

## Decision

We will implement a **Decoupled Serverless Architecture** utilizing a multi-cloud approach to optimize for cost and performance.

### 1. Frontend Framework

- **Technology:** Next.js 15 (App Router) with TypeScript.
- **Deployment:** Vercel (Hobby Tier).
- **Reasoning:** Provides Server-Side Rendering (SSR) and Static Site Generation (SSG) for fast initial loads (First Contentful Paint), which is critical for mobile users in low-coverage areas.

### 2. UI & Component Library

- **Technology:** **shadcn/ui** (Radix UI primitives) + Tailwind CSS.
- **Brand Colors:** Primary `#1B4332` (Forest Green), Secondary `#4E342E` (Roasted Coffee).
- **Reasoning:** \* **Zero Runtime Overhead:** Unlike Material-UI (MUI), shadcn/ui does not bundle a heavy styling engine, significantly reducing the JavaScript bundle size.
  - **Accessibility:** Built-in WCAG compliance ensures the app is usable by all citizens, a legal requirement for government software.

### 3. Backend & Data Layer

- **Technology:** Google Firebase (Spark Plan).
  - **Auth:** Firebase Authentication (Anonymous, Email, Google).
  - **Database:** Cloud Firestore (NoSQL).
- **Reasoning:** Firestore offers real-time capabilities for the admin dashboard and a generous free tier (50k reads/20k writes per day) that suffices for municipal scale.

### 4. Binary Storage Strategy (The "Zero-Cost" Core)

- **Storage Provider:** **Backblaze B2** (using S3-Compatible API).
- **Delivery Network (CDN):** **Cloudflare**.
- **Integration:** Backblaze bucket sits behind a Cloudflare Proxy.
- **Reasoning:** \* Firebase Storage (Google Cloud) has a low free limit (5GB) and high bandwidth costs.
  - Backblaze B2 offers **10GB free storage**.
  - **Crucial:** The "Bandwidth Alliance" between Backblaze and Cloudflare waives Egress (download) fees. This makes viewing reports on the dashboard effectively free, regardless of traffic volume.

### 5. Client-Side Optimization

- **Library:** `browser-image-compression`.
- **Strategy:** All images are compressed to **WebP format** (Max width: 1280px, Quality: 0.7) _before_ upload.
- **Reasoning:** Reduces average file size from ~5MB to ~150KB, accelerating uploads on 4G networks and extending the longevity of the 10GB storage limit by factor of 30x.

### 6. Progressive Web App (PWA)

- **Technology:** `next-pwa` with Workbox for service worker generation.
- **Features:**
  - **Installable:** Users can add the app to their home screen for a native-like experience.
  - **Offline Caching:** Static assets, Google Fonts, and images are cached using CacheFirst strategy.
  - **Standalone Mode:** No browser chrome when launched from home screen.
- **Caching Strategy:**
  - Google Fonts: CacheFirst (1 year TTL)
  - Local images: CacheFirst (30 days TTL)
  - B2 images: CacheFirst (7 days TTL)
- **Reasoning:** Mobile-first users in areas with unstable 4G connectivity benefit from cached resources. The installable PWA removes friction compared to native app stores and maintains zero-cost distribution.

### 7. Server-Side Upload Architecture

- **Strategy:** B2 credentials are kept server-side only; uploads go through Next.js API routes.
- **API Routes:**
  - `/api/upload` - Receives image, uploads to B2, returns presigned URL
  - `/api/image` - Generates presigned URLs for private bucket access
- **Reasoning:**
  - **Security:** No cloud credentials exposed to client-side JavaScript.
  - **Private Bucket:** Avoids $1/month public bucket fee while maintaining secure access.
  - **Presigned URLs:** 7-day validity for image viewing, regenerated on admin dashboard load.

### 8. Duplicate Detection & Geolocation

- **Technology:** `ngeohash` for geospatial indexing + Firebase Admin SDK for server-side queries.
- **Strategy:**
  - Reports include a `geohash` field (7-character precision, ~150m accuracy).
  - Before submission, `/api/check-duplicate` queries nearby reports using geohash prefix matching.
  - Duplicates are flagged if: same category, within 50m radius, created within 7 days.
- **Service Area Validation:**
  - GPS coordinates are validated against a 15km radius around Coatepec center.
  - Reports outside the service area are rejected with a user-friendly message.
- **Reasoning:** Prevents duplicate reports of the same issue while allowing legitimate nearby reports. Geohash enables efficient Firestore queries without expensive geospatial indexes.

## Consequences

### Positive

- **Economic Sustainability:** The project can operate indefinitely without funding for server costs, removing a major barrier to entry for the municipality.
- **High Performance:** Assets are served via Cloudflare's Edge network, ensuring low latency within Veracruz.
- **Data Sovereignty:** Data is structured logically (JSON/NoSQL), allowing for easy migration if budget allows for a unified enterprise cloud in the future.
- **Native-Like Experience:** PWA support enables home screen installation without app store distribution costs or approval delays.
- **Offline Resilience:** Service worker caching ensures the app remains functional even with intermittent connectivity.
- **Enhanced Security:** Server-side upload architecture keeps cloud credentials secure and enables private bucket usage.
- **Data Quality:** Duplicate detection reduces redundant reports, improving efficiency for municipal staff.

### Negative / Risks

- **Development Complexity:** Managing multiple infrastructure providers (Firebase, Backblaze, Vercel) increases setup time compared to a monolithic approach.
- **Key Management:** Requires careful handling of credentials in environment variables; server-side keys must never be exposed.
- **Firebase Admin SDK:** Duplicate detection requires Firebase Admin credentials, adding another secret to manage.
- **Service Worker Updates:** Users may see stale content until the service worker updates; `skipWaiting` mitigates this.

## Compliance & Security

- **Rules:** Firestore Security Rules must enforce strict `create-only` permissions for citizens and `read-write` for Admins.
- **Validation:** All inputs must be validated via **Zod** schemas to prevent injection attacks or malformed data.
