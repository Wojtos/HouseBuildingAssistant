# Fly.io Deployment Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      FLY.IO FREE TIER                       │
│                      Warsaw Region (waw)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │ homebuild-frontend      │  │ homebuild-backend       │  │
│  │ homebuild-frontend.fly.dev│  │ homebuild-backend.fly.dev│  │
│  │ ─────────────────────── │  │ ─────────────────────── │  │
│  │ 256MB RAM, shared CPU   │  │ 256MB RAM, shared CPU   │  │
│  │ Astro + Node.js         │  │ Python + FastAPI        │  │
│  └───────────┬─────────────┘  └───────────┬─────────────┘  │
│              │                            │                 │
└──────────────┼────────────────────────────┼─────────────────┘
               │                            │
               ▼                            ▼
       ┌─────────────────────────────────────────┐
       │           SUPABASE (External)           │
       │  • Auth  • PostgreSQL  • pgvector       │
       └─────────────────────────────────────────┘
```

## Deployment Flow

```
GitHub Push to main
        │
        ▼
┌───────────────────┐
│ GitHub Actions    │
│ deploy.yml        │
└────────┬──────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ Deploy Backend  │  │ Deploy Frontend │
│ (runs first)    │  │ (runs second)   │
└─────────────────┘  └─────────────────┘
```

## Free Tier Limits

| Resource | Free Allowance | Our Usage |
|----------|----------------|-----------|
| Shared VMs | 3 (256MB RAM each) | 2 |
| Persistent Volumes | 3GB total | 0 (Supabase handles data) |
| Outbound Transfer | 160GB/month | Depends on traffic |
| Domains | Unlimited `*.fly.dev` | 2 subdomains |

## Manual Setup Steps (One-Time)

### Step 1: Install Fly CLI

```bash
# macOS
brew install flyctl

# Or via curl
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login to Fly.io

```bash
fly auth login
```

This opens a browser for authentication.

### Step 3: Create Fly.io Apps

```bash
# Create backend app
cd backend
fly apps create homebuild-backend

# Create frontend app
cd ../frontend
fly apps create homebuild-frontend
```

### Step 4: Set Backend Secrets

```bash
cd backend
fly secrets set \
  SUPABASE_URL="https://your-project.supabase.co" \
  SUPABASE_KEY="your-supabase-anon-key" \
  OPENROUTER_API_KEY="sk-or-your-openrouter-key" \
  CORS_ORIGINS="https://homebuild-frontend.fly.dev"
```

### Step 5: Set Frontend Secrets

```bash
cd frontend
fly secrets set \
  PUBLIC_SUPABASE_URL="https://your-project.supabase.co" \
  PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key" \
  PUBLIC_API_URL="https://homebuild-backend.fly.dev"
```

### Step 6: Create GitHub Deploy Token

```bash
fly tokens create deploy -x 999999h
```

Copy the output token, then:
1. Go to GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `FLY_API_TOKEN`
4. Value: (paste the token)

### Step 7: Update Supabase Auth Settings

In Supabase Dashboard (https://supabase.com/dashboard):
1. Select your project
2. Go to Authentication → URL Configuration
3. Set Site URL: `https://homebuild-frontend.fly.dev`
4. Add to Redirect URLs: `https://homebuild-frontend.fly.dev`

## Automated Configuration Files

These files are created automatically:

| File | Purpose |
|------|---------|
| `backend/fly.toml` | Fly.io config for Python backend |
| `frontend/fly.toml` | Fly.io config for Astro frontend |
| `.github/workflows/deploy.yml` | Auto-deploy on push to main |

---

## GitHub Actions Deployment Configuration

### Overview

The deployment workflow (`.github/workflows/deploy.yml`) triggers on every push to `main` and deploys both services to Fly.io.

### Workflow Structure

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main

jobs:
  deploy-backend:
    # Deploys Python backend first
    
  deploy-frontend:
    # Deploys Astro frontend after backend succeeds
    needs: deploy-backend
```

### Required GitHub Secrets

Configure these in: **Repository → Settings → Secrets and variables → Actions**

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `FLY_API_TOKEN` | Fly.io deploy token | Run `fly tokens create deploy -x 999999h` |

### Step-by-Step GitHub Configuration

#### 1. Navigate to Repository Secrets

```
GitHub.com → Your Repository → Settings → Secrets and variables → Actions
```

#### 2. Add FLY_API_TOKEN Secret

1. Click **"New repository secret"**
2. Name: `FLY_API_TOKEN`
3. Value: Paste the token from `fly tokens create deploy -x 999999h`
4. Click **"Add secret"**

#### 3. Verify Workflow File Exists

Ensure `.github/workflows/deploy.yml` exists with content similar to:

```yaml
name: Deploy to Fly.io

on:
  push:
    branches:
      - main

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  deploy-backend:
    name: Deploy Backend
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy backend to Fly.io
        run: flyctl deploy --remote-only
        working-directory: backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend:
    name: Deploy Frontend
    needs: deploy-backend
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Fly CLI
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy frontend to Fly.io
        run: flyctl deploy --remote-only
        working-directory: frontend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Workflow Behavior

| Trigger | Action |
|---------|--------|
| Push to `main` | Deploy both backend and frontend |
| Push to other branches | No deployment (only PR checks run) |
| Pull Request to `main` | Run tests only (no deployment) |

### Deployment Order

1. **Backend deploys first** - Ensures API is available
2. **Frontend deploys after** - Uses `needs: deploy-backend` dependency
3. **Concurrency control** - Cancels in-progress deploys if new push arrives

### Monitoring Deployments

#### In GitHub Actions UI

1. Go to **Actions** tab in your repository
2. Click on the running/completed workflow
3. Expand each job to see deployment logs

#### In Fly.io Dashboard

1. Go to https://fly.io/dashboard
2. Select your app (homebuild-backend or homebuild-frontend)
3. View deployment history, logs, and metrics

### Rollback Procedure

If a deployment fails or introduces bugs:

```bash
# List recent deployments
fly releases -a homebuild-backend

# Rollback to previous version
fly releases rollback -a homebuild-backend

# Or specify version number
fly releases rollback 5 -a homebuild-backend
```

### Branch-Based Preview Environments (Advanced)

To deploy preview environments for PRs (exceeds free tier):

```yaml
on:
  pull_request:
    branches: [main]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: |
          fly apps create homebuild-backend-pr-${{ github.event.number }} || true
          flyctl deploy --remote-only --app homebuild-backend-pr-${{ github.event.number }}
        working-directory: backend
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Note:** Each preview environment uses a VM from your free tier quota.

---

## Makefile Commands

After setup, use these commands:

```bash
# Deploy both services
make deploy

# Deploy individually
make deploy-backend
make deploy-frontend

# View logs
make fly-logs-backend
make fly-logs-frontend

# Check status
make fly-status
```

## First Manual Deployment

After completing steps 1-7, deploy manually once to verify:

```bash
# Deploy backend first
cd backend
fly deploy

# Then frontend
cd ../frontend
fly deploy
```

## Monitoring and Debugging

### View Logs
```bash
# Real-time logs
fly logs -a homebuild-backend
fly logs -a homebuild-frontend

# Or via Makefile
make fly-logs-backend
make fly-logs-frontend
```

### Check App Status
```bash
fly status -a homebuild-backend
fly status -a homebuild-frontend
```

### SSH into Container
```bash
fly ssh console -a homebuild-backend
```

### View Metrics
```bash
fly dashboard -a homebuild-backend
```

## Cost Projection

| Scenario | Monthly Cost |
|----------|--------------|
| Side project (low traffic, auto-stop) | $0 |
| Growing usage (RAM upgrade to 512MB) | ~$6-10 |
| Production (always-on, 512MB each) | ~$12-15 |

## Troubleshooting

### Cold Start Issues
Apps auto-stop after inactivity. First request after sleep has 2-5s delay.
To disable auto-stop (uses more free tier quota):
```toml
# In fly.toml
min_machines_running = 1
```

### 256MB RAM Not Enough
If backend crashes with OOM errors:
```bash
fly scale memory 512 -a homebuild-backend
```
This costs ~$3.19/month per app.

### CORS Errors
Verify backend CORS_ORIGINS includes the frontend URL:
```bash
fly secrets list -a homebuild-backend
# Should show CORS_ORIGINS=https://homebuild-frontend.fly.dev
```

### Auth Redirect Errors
Ensure Supabase redirect URLs include your Fly.io domain.

---

## Pre-Deployment Checklist

Before your first deployment, verify all steps are complete:

### Fly.io Setup
- [ ] Fly CLI installed (`fly version` works)
- [ ] Logged in to Fly.io (`fly auth whoami` shows your email)
- [ ] Backend app created (`fly apps list` shows `homebuild-backend`)
- [ ] Frontend app created (`fly apps list` shows `homebuild-frontend`)
- [ ] Backend secrets set (`fly secrets list -a homebuild-backend`)
- [ ] Frontend secrets set (`fly secrets list -a homebuild-frontend`)

### GitHub Setup
- [ ] `FLY_API_TOKEN` secret added to repository
- [ ] `.github/workflows/deploy.yml` file exists
- [ ] Workflow file committed and pushed to `main`

### Supabase Setup
- [ ] Site URL updated to `https://homebuild-frontend.fly.dev`
- [ ] Redirect URL added for `https://homebuild-frontend.fly.dev`

### Configuration Files
- [ ] `backend/fly.toml` exists with correct app name
- [ ] `frontend/fly.toml` exists with correct app name
- [ ] `.gitignore` includes `.fly/` directory

### Verification Commands

```bash
# Verify Fly.io apps exist
fly apps list

# Verify secrets are set
fly secrets list -a homebuild-backend
fly secrets list -a homebuild-frontend

# Test manual deployment (run before relying on GitHub Actions)
cd backend && fly deploy
cd ../frontend && fly deploy

# Verify apps are running
fly status -a homebuild-backend
fly status -a homebuild-frontend

# Test endpoints
curl https://homebuild-backend.fly.dev/health
curl https://homebuild-frontend.fly.dev
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Deploy backend | `fly deploy -a homebuild-backend` |
| Deploy frontend | `fly deploy -a homebuild-frontend` |
| View backend logs | `fly logs -a homebuild-backend` |
| View frontend logs | `fly logs -a homebuild-frontend` |
| SSH into backend | `fly ssh console -a homebuild-backend` |
| Check status | `fly status -a homebuild-backend` |
| List secrets | `fly secrets list -a homebuild-backend` |
| Set secret | `fly secrets set KEY=value -a homebuild-backend` |
| Rollback | `fly releases rollback -a homebuild-backend` |
| Scale memory | `fly scale memory 512 -a homebuild-backend` |
| Open dashboard | `fly dashboard -a homebuild-backend` |
