#!/usr/bin/env bash
# One-time setup for GCP: Workload Identity Federation + Artifact Registry + Secret Manager.
# Run once after creating the GCP project. Requires gcloud authenticated as project owner.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-kanban-live}"
REGION="${REGION:-us-central1}"
SERVICE_ACCOUNT_NAME="github-actions"
POOL_NAME="github-actions-pool"
PROVIDER_NAME="github-actions-provider"
GITHUB_OWNER="${GITHUB_OWNER:-Alejandro-Montepeque}"
GITHUB_REPO="${GITHUB_REPO:-kanban-live}"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

echo "Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iamcredentials.googleapis.com \
  secretmanager.googleapis.com \
  --project="$PROJECT_ID"

echo "Creating service account..."
gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
  --display-name="GitHub Actions deployer" \
  --project="$PROJECT_ID" 2>/dev/null || true

SA_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Granting roles to service account..."
for role in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer roles/secretmanager.secretAccessor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SA_EMAIL" \
    --role="$role" \
    --quiet
done

echo "Creating Workload Identity Pool..."
gcloud iam workload-identity-pools create "$POOL_NAME" \
  --location=global \
  --display-name="GitHub Actions Pool" \
  --project="$PROJECT_ID" 2>/dev/null || true

echo "Creating OIDC provider..."
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_NAME" \
  --location=global \
  --workload-identity-pool="$POOL_NAME" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == '${GITHUB_OWNER}'" \
  --project="$PROJECT_ID" 2>/dev/null || true

echo "Binding service account to GitHub repo..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/attribute.repository/${GITHUB_OWNER}/${GITHUB_REPO}" \
  --project="$PROJECT_ID"

echo "Creating Artifact Registry repo..."
gcloud artifacts repositories create kanban-live \
  --repository-format=docker \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || true

echo "Creating placeholder secrets..."
echo "REPLACE_WITH_YOUR_NEON_URL" | gcloud secrets create database-url \
  --data-file=- \
  --project="$PROJECT_ID" 2>/dev/null || true

echo "REPLACE_WITH_A_LONG_RANDOM_STRING" | gcloud secrets create jwt-access-secret \
  --data-file=- \
  --project="$PROJECT_ID" 2>/dev/null || true

echo "REPLACE_WITH_ANOTHER_LONG_RANDOM_STRING" | gcloud secrets create jwt-refresh-secret \
  --data-file=- \
  --project="$PROJECT_ID" 2>/dev/null || true

# Cloud Run runs containers using the default Compute Engine service account.
# Grant it read access to the secrets so the deployed revision can mount them.
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
echo "Granting Secret Accessor to Cloud Run runtime SA ($COMPUTE_SA)..."
for secret in database-url jwt-access-secret jwt-refresh-secret; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:$COMPUTE_SA" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$PROJECT_ID" \
    --quiet
done

echo
echo "Done. Add these GitHub repo secrets:"
echo "  GCP_PROJECT_ID         = $PROJECT_ID"
echo "  GCP_SERVICE_ACCOUNT    = $SA_EMAIL"
echo "  GCP_WIF_PROVIDER       = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_NAME}/providers/${PROVIDER_NAME}"
echo "  ALLOWED_ORIGINS        = https://kanban-live.vercel.app,http://localhost:5173"
echo
echo "Then update the Secret Manager values with your real ones:"
echo "  echo -n 'postgresql://...?ssl=require' | gcloud secrets versions add database-url --data-file=- --project=$PROJECT_ID"
echo "  openssl rand -base64 64 | gcloud secrets versions add jwt-access-secret  --data-file=- --project=$PROJECT_ID"
echo "  openssl rand -base64 64 | gcloud secrets versions add jwt-refresh-secret --data-file=- --project=$PROJECT_ID"
