# 🚀 Quick Start Guide

Get Reporte Ciudadano Coatepec running in 10 minutes.

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- Git

## Step-by-Step Setup

### 1. Clone & Install (2 min)

```bash
git clone https://github.com/tu-usuario/reporte-ciudadano.git
cd reporte-ciudadano
pnpm install
```

### 2. Firebase Setup (3 min)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Name: `reporte-ciudadano-coatepec`
4. Disable Google Analytics (optional)
5. Create project

**Enable Firestore:**

1. Build → Firestore Database → Create database
2. Start in **production mode**
3. Choose location: `us-central` (or nearest)

**Get credentials:**

1. Project Settings (⚙️) → General
2. Scroll to "Your apps" → Web app (</>)
3. Register app: `Reporte Ciudadano Web`
4. Copy the `firebaseConfig` object

### 3. Backblaze B2 Setup (3 min)

1. Sign up at [Backblaze B2](https://www.backblaze.com/b2/sign-up.html)
2. B2 Cloud Storage → Buckets → Create a Bucket
   - Name: `reporte-ciudadano-coatepec`
   - Files: **Public**
   - Encryption: Disabled
3. App Keys → Add a New Application Key
   - Name: `web-client-upload`
   - Access: Read and Write
   - Copy the **keyID** and **applicationKey**
4. Note your endpoint (e.g., `s3.us-west-004.backblazeb2.com`)

### 4. Environment Variables (1 min)

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# From Firebase config object
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=reporte-ciudadano-xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=reporte-ciudadano-xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=reporte-ciudadano-xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# From Backblaze B2
NEXT_PUBLIC_B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
NEXT_PUBLIC_B2_REGION=us-west-004
NEXT_PUBLIC_B2_ACCESS_KEY_ID=your-key-id
NEXT_PUBLIC_B2_SECRET_ACCESS_KEY=your-application-key
NEXT_PUBLIC_B2_BUCKET_NAME=reporte-ciudadano-coatepec
NEXT_PUBLIC_CDN_URL=https://f004.backblazeb2.com/file/reporte-ciudadano-coatepec
```

### 5. Deploy Firestore Rules (1 min)

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login
firebase login

# Initialize (select existing project)
firebase init firestore

# Deploy rules
firebase deploy --only firestore:rules
```

### 6. Run Development Server (< 1 min)

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## Test the App

1. **Submit a report:**
   - Select category: "Baches y Pavimento"
   - Write description (10+ characters)
   - Upload a photo
   - Allow location access
   - Click "Enviar Reporte"

2. **View admin dashboard:**
   - Go to [http://localhost:3000/admin](http://localhost:3000/admin)
   - See your report in real-time
   - Change status to "En Progreso"

## Deploy to Vercel (Bonus - 2 min)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts, add env variables when asked
```

Or use the web interface:

1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Add environment variables
4. Deploy!

## Troubleshooting

**Error: "Firebase: Error (auth/operation-not-allowed)"**

- Enable Email/Password or Anonymous auth in Firebase Console

**Error: "Access Denied" on image upload**

- Check B2 bucket is set to **Public**
- Verify CORS configuration on B2 bucket

**Images not showing**

- Verify `NEXT_PUBLIC_CDN_URL` points to your B2 bucket
- Check browser console for CORS errors

**TypeScript errors**

```bash
pnpm build
# Fix any type errors before deploying
```

## Next Steps

- [ ] Enable Firebase Authentication for admin panel
- [ ] Add custom domain to Vercel
- [ ] Configure Cloudflare for bandwidth savings
- [ ] Customize municipality colors in `tailwind.config.ts`
- [ ] Add Google Search Console verification
- [ ] Set up monitoring (Vercel Analytics, Firebase)

## Support

- Check [README.md](./README.md) for detailed documentation
- Open issue on GitHub
- Review Firebase and Backblaze documentation

---

**You're all set! Happy coding 🚀**
