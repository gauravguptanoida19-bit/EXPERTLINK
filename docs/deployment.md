# ExpertLink Production Deployment Guide (Render & Railway)

This guide documents the exact configuration steps to deploy ExpertLink onto Render or Railway using GitHub Actions and GitHub Container Registry (GHCR).

---

## 1. Required Environment Variables & Secrets

### GitHub Repository Secrets (`Settings -> Secrets and variables -> Actions`)
| Secret Name | Description | Example |
|---|---|---|
| `RENDER_DEPLOY_HOOK_URL` | *(Optional if using Render)* Deploy webhook URL from Render service | `https://api.render.com/deploy/srv-abc123xyz?key=...` |
| `RAILWAY_TOKEN` | *(Optional if using Railway)* Railway project API token | `rly_tok_abc123...` |

### Service Environment Variables
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:password@pg-host:5432/expertlink?schema=public
MONGODB_URI=mongodb://mongo-host:27017/expertlink
REDIS_URL=redis://redis-host:6379
JWT_SECRET=production_super_secret_signing_key_min_32_characters
JWT_REFRESH_SECRET=production_super_secret_refresh_key_min_32_characters
ML_SERVICE_URL=http://ml-service:8000
CORS_ORIGIN=https://your-expertlink-web.up.railway.app
LLM_API_KEY=your_gemini_api_key_here
```

---

## 2. Deploying on Railway (Recommended for Monorepos)

1. **Create New Project**:
   - Go to [railway.app](https://railway.app) -> **New Project** -> **Deploy from GitHub repo**.
2. **Add Managed Databases**:
   - Add **PostgreSQL** database service (`DATABASE_URL` is auto-populated).
   - Add **Redis** service (`REDIS_URL` is auto-populated).
   - Add **MongoDB** service (`MONGODB_URI` is auto-populated).
3. **Configure Services**:
   - **`expertlink-api`**:
     - Root Directory: `apps/api`
     - Dockerfile: `apps/api/Dockerfile`
     - Port: `4000`
   - **`expertlink-ml`**:
     - Root Directory: `apps/ml-service`
     - Dockerfile: `apps/ml-service/Dockerfile`
     - Port: `8000`
   - **`expertlink-web`**:
     - Root Directory: `apps/web`
     - Dockerfile: `apps/web/Dockerfile`
     - Port: `80` (Nginx)
4. **Run Migrations & Seed**:
   - In `expertlink-api` service, run:
     ```bash
     npx prisma db push
     npm run seed
     ```
5. **Continuous Deployment via GitHub Actions**:
   - Create a Railway Project Token in **Project Settings -> Tokens**.
   - Add `RAILWAY_TOKEN` to GitHub Secrets.
   - Every push to `main` triggers `.github/workflows/deploy.yml` to build images and invoke `railway up`.

---

## 3. Deploying on Render

1. **Create Managed Services**:
   - **PostgreSQL**: Standard instance.
   - **Redis**: Key-value instance.
   - **MongoDB**: External MongoDB Atlas free cluster connection string.
2. **Create Web Services**:
   - **API Web Service**:
     - Environment: Docker
     - Path: `apps/api/Dockerfile`
     - Add environment variables listed above.
   - **ML Web Service**:
     - Environment: Docker
     - Path: `apps/ml-service/Dockerfile`
   - **Static / Web Service**:
     - Environment: Docker (Nginx)
     - Path: `apps/web/Dockerfile`
3. **Set Up Deploy Hook**:
   - In Render API service settings, copy the **Deploy Hook URL**.
   - Add `RENDER_DEPLOY_HOOK_URL` in GitHub Repository Secrets.
   - Pushes to `main` will automatically trigger zero-downtime deployment.
