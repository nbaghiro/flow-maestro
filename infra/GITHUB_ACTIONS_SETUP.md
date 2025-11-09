# GitHub Actions CI/CD Setup Guide

Complete guide for setting up GitHub Actions to deploy FlowMaestro to GKE with Workload Identity Federation.

---

## Overview

This repository includes two GitHub Actions workflows:

1. **`ci.yml`** - Continuous Integration
   - Runs on pull requests and pushes to main/develop
   - Type checking, linting, testing, Docker build validation

2. **`deploy-gke.yml`** - Deployment to GKE
   - Manual trigger (workflow_dispatch)
   - Builds and pushes Docker images to Artifact Registry
   - Deploys to GKE using Kustomize
   - Supports production and staging environments

---

## Prerequisites

Before setting up GitHub Actions, ensure you have:

1. ✅ GCP project created
2. ✅ Infrastructure deployed via Pulumi (see `infra/README.md`)
3. ✅ GKE cluster running
4. ✅ Artifact Registry repository created
5. ✅ Domain configured with DNS pointing to load balancer

---

## Setup Steps

### Step 1: Enable Required GCP APIs

```bash
gcloud services enable iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  sts.googleapis.com
```

### Step 2: Create Service Account for GitHub Actions

```bash
# Set variables
export PROJECT_ID="your-gcp-project-id"
export SERVICE_ACCOUNT_NAME="github-actions-deployer"
export SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name="GitHub Actions Deployer" \
  --project=$PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/storage.objectViewer"
```

### Step 3: Set Up Workload Identity Federation

Workload Identity Federation allows GitHub Actions to authenticate to GCP without service account keys (more secure).

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-actions-pool" \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Get the pool ID
export WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe "github-actions-pool" \
  --project=$PROJECT_ID \
  --location="global" \
  --format="value(name)")

# Create Workload Identity Provider for GitHub
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the provider ID
export WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-provider" \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --format="value(name)")

echo "Workload Identity Provider: $WORKLOAD_IDENTITY_PROVIDER"
```

### Step 4: Bind Service Account to GitHub Repository

```bash
# Set your GitHub repository (format: owner/repo)
export GITHUB_REPO="your-github-username/flowmaestro"

# Allow GitHub Actions from your repository to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding $SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

### Step 5: Configure GitHub Repository Secrets and Variables

Go to your GitHub repository → Settings → Secrets and variables → Actions

#### **Secrets** (encrypted values)

Create these secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider` | From Step 3 |
| `GCP_SERVICE_ACCOUNT` | `github-actions-deployer@PROJECT_ID.iam.gserviceaccount.com` | Service account email |

**To get the full Workload Identity Provider path:**

```bash
echo "projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider"
```

#### **Variables** (non-sensitive values)

Create these variables:

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `GCP_PROJECT_ID` | `your-gcp-project-id` | Your GCP project ID |
| `GCP_REGION` | `us-central1` | GCP region |
| `VITE_API_URL` | `https://api.yourdomain.com` | Frontend API URL |
| `VITE_WS_URL` | `wss://api.yourdomain.com` | Frontend WebSocket URL |

### Step 6: Configure GitHub Environments (Optional but Recommended)

GitHub Environments allow environment-specific secrets and protection rules.

1. Go to repository → Settings → Environments
2. Create two environments:
   - `production`
   - `staging`

For each environment, you can:
- Add environment-specific variables (e.g., different domains)
- Require approval before deployment (recommended for production)
- Restrict to specific branches

**Example: Production Environment Protection**

- ✅ Required reviewers: Add team members who must approve production deployments
- ✅ Wait timer: Optional delay before deployment
- ✅ Deployment branches: Only allow `main` branch

---

## Usage

### Running CI Workflow

The CI workflow runs automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`

**What it does:**
- Type checks all TypeScript code
- Runs linting
- Checks code formatting
- Runs unit and integration tests
- Validates Docker builds

### Running Deployment Workflow

The deployment workflow is **manually triggered**.

#### Via GitHub UI:

1. Go to repository → Actions
2. Select "Deploy to GKE" workflow
3. Click "Run workflow"
4. Select:
   - **Branch**: Choose branch to deploy (usually `main`)
   - **Environment**: `production` or `staging`
   - **Image tag** (optional): Leave empty to use git SHA

#### Via GitHub CLI:

```bash
# Install GitHub CLI if needed
# https://cli.github.com/

# Deploy staging
gh workflow run deploy-gke.yml \
  -f environment=staging

# Deploy production
gh workflow run deploy-gke.yml \
  -f environment=production

# Deploy with specific image tag
gh workflow run deploy-gke.yml \
  -f environment=production \
  -f image_tag=v1.2.3
```

### Deployment Process

When you trigger the deployment workflow:

1. **Checkout code** from selected branch
2. **Authenticate to GCP** using Workload Identity Federation
3. **Build Docker images** (backend, frontend, marketing) in parallel
4. **Push images** to Artifact Registry with tags:
   - `{git-sha}` (e.g., `abc123f`)
   - `latest`
5. **Update Kustomize overlay** with new image tags
6. **Deploy to GKE** using `kubectl apply -k`
7. **Wait for rollouts** to complete (all deployments must be healthy)
8. **Verify deployment** and show pod status

**Deployment time**: ~8-12 minutes (depending on image cache)

---

## Workflow Details

### deploy-gke.yml

```yaml
Inputs:
  - environment: production | staging (required)
  - image_tag: Custom tag or empty for git SHA (optional)

Environment Variables:
  - GCP_REGION: us-central1
  - GKE_CLUSTER: flowmaestro-cluster
  - ARTIFACT_REGISTRY: {region}-docker.pkg.dev/{project}/flowmaestro
  - IMAGE_TAG: {input} or {git-sha}

Jobs:
  build-and-deploy:
    - Builds: backend, frontend, marketing
    - Deploys: api-server, temporal-worker, frontend, marketing, temporal-server
    - Timeout: 60 minutes
```

### ci.yml

```yaml
Triggers:
  - Pull requests to main/develop
  - Pushes to main/develop

Jobs:
  test:
    - Node.js 20.x
    - npm ci (install dependencies)
    - Type check, lint, format check
    - Unit tests, integration tests
    - Build all packages

  docker-build:
    - Test Docker builds without pushing
    - Validates Dockerfiles
```

---

## Customization

### Adding More Environments

1. Create new Kustomize overlay:
   ```bash
   cp -r infra/k8s/overlays/staging infra/k8s/overlays/dev
   ```

2. Update `deploy-gke.yml`:
   ```yaml
   inputs:
     environment:
       options:
         - production
         - staging
         - dev  # Add new environment
   ```

3. Create GitHub environment (optional) for environment-specific variables

### Deploying to Different GCP Projects

To deploy staging and production to different GCP projects:

1. Create separate Workload Identity Providers in each project
2. Configure environment-specific secrets in GitHub:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER_STAGING`
   - `GCP_WORKLOAD_IDENTITY_PROVIDER_PRODUCTION`
   - `GCP_SERVICE_ACCOUNT_STAGING`
   - `GCP_SERVICE_ACCOUNT_PRODUCTION`

3. Update workflow to use environment-specific secrets:
   ```yaml
   - name: Authenticate to Google Cloud
     uses: google-github-actions/auth@v2
     with:
       workload_identity_provider: ${{ secrets[format('GCP_WORKLOAD_IDENTITY_PROVIDER_{0}', upper(github.event.inputs.environment))] }}
       service_account: ${{ secrets[format('GCP_SERVICE_ACCOUNT_{0}', upper(github.event.inputs.environment))] }}
   ```

### Auto-Deploy on Merge

To auto-deploy when merging to specific branches:

```yaml
# Add to deploy-gke.yml
on:
  workflow_dispatch:
    # ... existing inputs ...

  push:
    branches:
      - main  # Auto-deploy production on merge to main

jobs:
  build-and-deploy:
    # Set environment based on trigger
    environment: ${{ github.event.inputs.environment || 'production' }}
```

---

## Troubleshooting

### Authentication Failed

**Error**: `Error: google-github-actions/auth failed with: retry function failed after 3 attempts`

**Solution**: Verify Workload Identity Federation setup:

```bash
# Test impersonation
gcloud iam service-accounts get-iam-policy $SERVICE_ACCOUNT_EMAIL \
  --project=$PROJECT_ID

# Should show principalSet binding for your GitHub repo
```

### Image Push Failed

**Error**: `denied: Permission denied for "artifact-registry"`

**Solution**: Grant Artifact Registry Writer role:

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/artifactregistry.writer"
```

### Deployment Timeout

**Error**: `Waiting for deployment rollout to finish... timeout`

**Solution**:
1. Check pod logs:
   ```bash
   kubectl logs -f deployment/api-server -n flowmaestro
   ```
2. Check pod events:
   ```bash
   kubectl describe pod <pod-name> -n flowmaestro
   ```
3. Common issues:
   - Image pull errors (check registry permissions)
   - Missing secrets (verify K8s secrets exist)
   - Database connection issues (check Cloud SQL proxy)

### Kustomize Edit Failed

**Error**: `unable to find one or more images`

**Solution**: Ensure image names in `kustomization.yaml` match exactly:

```yaml
# infra/k8s/overlays/production/kustomization.yaml
images:
  - name: REGION-docker.pkg.dev/PROJECT_ID/flowmaestro/backend
    newName: us-central1-docker.pkg.dev/actual-project/flowmaestro/backend
    newTag: latest
```

---

## Security Best Practices

1. ✅ **Use Workload Identity Federation** (no service account keys)
2. ✅ **Require reviews** for production deployments
3. ✅ **Use environment-specific secrets** for sensitive values
4. ✅ **Rotate service accounts** periodically
5. ✅ **Monitor deployments** with Cloud Monitoring alerts
6. ✅ **Use least privilege** IAM roles
7. ✅ **Enable branch protection** on main branch
8. ✅ **Use signed commits** for production deployments

---

## Monitoring Deployments

### View Deployment Status

```bash
# Watch deployment progress
kubectl rollout status deployment/api-server -n flowmaestro

# View all pods
kubectl get pods -n flowmaestro

# View recent events
kubectl get events -n flowmaestro --sort-by='.lastTimestamp'
```

### View Build Logs

GitHub Actions → Select workflow run → View job logs

### GCP Artifact Registry

View pushed images:

```bash
gcloud artifacts docker images list \
  ${GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/flowmaestro
```

---

## Cost Considerations

GitHub Actions pricing:
- **Public repositories**: Free unlimited minutes
- **Private repositories**:
  - Free tier: 2,000 minutes/month
  - After free tier: $0.008/minute

**Typical workflow usage:**
- CI workflow: ~5 minutes per run
- Deployment workflow: ~10 minutes per run

**Estimated monthly cost** (private repo, 50 deployments/month):
- CI runs: 100 × 5 min = 500 min (free tier)
- Deployments: 50 × 10 min = 500 min (free tier)
- **Total: $0/month** (within free tier)

---

## Next Steps

After setup is complete:

1. ✅ Test CI workflow by creating a pull request
2. ✅ Test deployment workflow by running manual deployment to staging
3. ✅ Set up deployment approval for production environment
4. ✅ Configure Slack/Discord notifications for deployment status
5. ✅ Add database migration step if needed
6. ✅ Set up monitoring and alerting in GCP

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [GKE Deployment Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)
- [Kustomize Documentation](https://kustomize.io/)

---

**Questions?** See `infra/README.md` for full infrastructure documentation.
