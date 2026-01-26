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

## Consequences

### Positive

- **Economic Sustainability:** The project can operate indefinitely without funding for server costs, removing a major barrier to entry for the municipality.
- **High Performance:** Assets are served via Cloudflare's Edge network, ensuring low latency within Veracruz.
- **Data Sovereignty:** Data is structured logically (JSON/NoSQL), allowing for easy migration if budget allows for a unified enterprise cloud in the future.

### Negative / Risks

- **Development Complexity:** Managing two separate infrastructure providers (Firebase vs. Backblaze) increases the setup time compared to a "monolithic" Firebase approach.
- **Key Management:** Requires careful handling of S3-compatible keys in environment variables to prevent leakage.
- **CORS Configuration:** Strict Cross-Origin Resource Sharing (CORS) rules must be applied to the Backblaze bucket to allow direct uploads from the browser while preventing abuse.

## Compliance & Security

- **Rules:** Firestore Security Rules must enforce strict `create-only` permissions for citizens and `read-write` for Admins.
- **Validation:** All inputs must be validated via **Zod** schemas to prevent injection attacks or malformed data.
