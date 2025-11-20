import * as pulumi from "@pulumi/pulumi";
import {
    databaseOutputs,
    appDatabaseConnectionString,
    temporalDatabaseConnectionString,
    temporalVisibilityDatabaseConnectionString
} from "./src/resources/database";
import { esoOutputs } from "./src/resources/external-secrets-operator";
import { clusterOutputs } from "./src/resources/gke-cluster";
import { monitoringOutputs } from "./src/resources/monitoring";
import { networkOutputs, staticIp } from "./src/resources/networking";
import { redisOutputs } from "./src/resources/redis";
import { secretOutputs } from "./src/resources/secrets";
import { storageOutputs } from "./src/resources/storage";
import { infrastructureConfig } from "./src/utils/config";

// Export all infrastructure outputs
export const outputs = {
    // Configuration
    project: infrastructureConfig.project,
    region: infrastructureConfig.region,
    environment: infrastructureConfig.environment,
    domain: infrastructureConfig.domain,

    // Network
    networkName: networkOutputs.networkName,
    subnetName: networkOutputs.subnetName,
    staticIpAddress: networkOutputs.staticIpAddress,

    // Application Database
    appDatabaseName: databaseOutputs.appDatabaseName,
    appDatabaseUser: databaseOutputs.appUserName,
    appDatabaseConnectionString: appDatabaseConnectionString,

    // Temporal Databases
    temporalDatabaseName: databaseOutputs.temporalDatabaseName,
    temporalVisibilityDatabaseName: databaseOutputs.temporalVisibilityDatabaseName,
    temporalDatabaseUser: databaseOutputs.temporalUserName,
    temporalDatabaseConnectionString: temporalDatabaseConnectionString,
    temporalVisibilityDatabaseConnectionString: temporalVisibilityDatabaseConnectionString,

    // Database Instance Info
    databaseInstanceName: databaseOutputs.instanceName,
    databaseConnectionName: databaseOutputs.instanceConnectionName,
    databasePrivateIp: databaseOutputs.privateIp,

    // Redis
    redisHost: redisOutputs.host,
    redisPort: redisOutputs.port,
    redisReadEndpoint: redisOutputs.readEndpoint,

    // GKE Cluster
    clusterName: clusterOutputs.clusterName,
    clusterEndpoint: clusterOutputs.clusterEndpoint,
    clusterCaCertificate: clusterOutputs.clusterCaCertificate,
    kubeconfig: clusterOutputs.kubeconfig,
    serviceAccountEmail: clusterOutputs.serviceAccountEmail,

    // Storage
    uploadsBucketName: storageOutputs.uploadsBucketName,
    uploadsBucketUrl: storageOutputs.uploadsBucketUrl,
    artifactsBucketName: storageOutputs.artifactsBucketName,
    artifactsBucketUrl: storageOutputs.artifactsBucketUrl,
    knowledgeDocsBucketName: storageOutputs.knowledgeDocsBucketName,
    knowledgeDocsBucketUrl: storageOutputs.knowledgeDocsBucketUrl,

    // Monitoring
    dashboardId: monitoringOutputs.dashboardId,

    // Secrets Management
    secretsDbPasswordId: secretOutputs.dbPasswordSecretId,
    secretsJwtSecretId: secretOutputs.jwtSecretSecretId,
    secretsEncryptionKeyId: secretOutputs.encryptionKeySecretId,
    secretsAppSecretIds: secretOutputs.appSecretIds,

    // External Secrets Operator
    esoNamespace: esoOutputs.namespace,
    esoServiceAccountName: esoOutputs.serviceAccountName,
    esoGcpServiceAccount: esoOutputs.gcpServiceAccountEmail,

    // Temporal Configuration (self-hosted)
    temporalNamespace: infrastructureConfig.temporalNamespace,

    // Instructions for next steps
    nextSteps: pulumi.interpolate`
FlowMaestro Infrastructure Deployed Successfully! 🎉

Next Steps:
===========

1. Configure kubectl:
   $ pulumi stack output kubeconfig > kubeconfig.yaml
   $ export KUBECONFIG=./kubeconfig.yaml
   $ kubectl get nodes

2. Configure DNS records for your domain (${infrastructureConfig.domain}):
   Create A records pointing to: ${staticIp.address}
   - api.${infrastructureConfig.domain}
   - app.${infrastructureConfig.domain}
   - www.${infrastructureConfig.domain}

3. Build and push Docker images:
   $ export IMAGE_TAG=$(git rev-parse --short HEAD)
   $ export REGISTRY="${infrastructureConfig.region}-docker.pkg.dev/${infrastructureConfig.project}/flowmaestro"

   # Create Artifact Registry repository
   $ gcloud artifacts repositories create flowmaestro \\
       --repository-format=docker \\
       --location=${infrastructureConfig.region}

   # Authenticate Docker
   $ gcloud auth configure-docker ${infrastructureConfig.region}-docker.pkg.dev

   # Build and push images
   $ docker build -f infra/docker/backend/Dockerfile -t $REGISTRY/backend:$IMAGE_TAG .
   $ docker push $REGISTRY/backend:$IMAGE_TAG

   $ docker build -f infra/docker/frontend/Dockerfile \\
       --build-arg VITE_API_URL=https://api.${infrastructureConfig.domain} \\
       --build-arg VITE_WS_URL=wss://api.${infrastructureConfig.domain} \\
       -t $REGISTRY/frontend:$IMAGE_TAG .
   $ docker push $REGISTRY/frontend:$IMAGE_TAG

   $ docker build -f infra/docker/marketing/Dockerfile -t $REGISTRY/marketing:$IMAGE_TAG .
   $ docker push $REGISTRY/marketing:$IMAGE_TAG

4. Create Kubernetes secrets:
   $ kubectl create namespace flowmaestro

   # Application database credentials
   $ kubectl create secret generic db-credentials \\
       --namespace=flowmaestro \\
       --from-literal=host=${databaseOutputs.privateIp} \\
       --from-literal=port=5432 \\
       --from-literal=database=${databaseOutputs.appDatabaseName} \\
       --from-literal=user=${databaseOutputs.appUserName} \\
       --from-literal=password='<from-pulumi-config-dbPassword>'

   # Temporal database credentials
   $ kubectl create secret generic temporal-db-credentials \\
       --namespace=flowmaestro \\
       --from-literal=host=${databaseOutputs.privateIp} \\
       --from-literal=port=5432 \\
       --from-literal=database=${databaseOutputs.temporalDatabaseName} \\
       --from-literal=visibility-database=${databaseOutputs.temporalVisibilityDatabaseName} \\
       --from-literal=user=${databaseOutputs.temporalUserName} \\
       --from-literal=password='<from-pulumi-config-dbPassword>'

   # Redis credentials
   $ kubectl create secret generic redis-credentials \\
       --namespace=flowmaestro \\
       --from-literal=host=${redisOutputs.host} \\
       --from-literal=port=${redisOutputs.port}

   # Application secrets
   $ kubectl create secret generic app-secrets \\
       --namespace=flowmaestro \\
       --from-literal=jwt-secret='<from-pulumi-config-jwtSecret>' \\
       --from-literal=encryption-key='<from-pulumi-config-encryptionKey>'

   # Integration secrets (from appSecrets config)
   $ kubectl create secret generic integration-secrets \\
       --namespace=flowmaestro \\
       --from-literal=OPENAI_API_KEY='<from-config>' \\
       --from-literal=ANTHROPIC_API_KEY='<from-config>' \\
       --from-literal=GOOGLE_API_KEY='<from-config>'

   # GCS configuration
   $ kubectl create configmap gcs-config \\
       --namespace=flowmaestro \\
       --from-literal=GCS_BUCKET_NAME=${storageOutputs.knowledgeDocsBucketName} \\
       --from-literal=GCS_PROJECT_ID=${infrastructureConfig.project}

5. Deploy Temporal server:
   $ kubectl apply -f infra/k8s/jobs/temporal-schema-migration.yaml
   $ kubectl wait --for=condition=complete job/temporal-schema-migration -n flowmaestro --timeout=5m
   $ kubectl apply -f infra/k8s/base/temporal-deployment.yaml

6. Deploy application:
   $ kubectl apply -f infra/k8s/jobs/db-migration.yaml
   $ kubectl wait --for=condition=complete job/db-migration -n flowmaestro --timeout=5m
   $ kubectl apply -k infra/k8s/overlays/production

   # Deploy analytics aggregation CronJobs
   $ kubectl apply -f infra/k8s/jobs/analytics-aggregation.yaml

7. Wait for SSL certificate (15-60 minutes):
   $ kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

8. Verify deployment:
   $ kubectl get pods -n flowmaestro
   $ kubectl get ingress -n flowmaestro
   $ kubectl get hpa -n flowmaestro

9. Access your application:
   - API: https://api.${infrastructureConfig.domain}
   - Frontend: https://app.${infrastructureConfig.domain}
   - Marketing: https://www.${infrastructureConfig.domain}
   - Monitoring: https://console.cloud.google.com/monitoring/dashboards/custom/${monitoringOutputs.dashboardId}

Connection Info:
================
Application Database:
  Host: ${databaseOutputs.privateIp}
  Port: 5432
  Database: ${databaseOutputs.appDatabaseName}
  User: ${databaseOutputs.appUserName}

Temporal Databases:
  Host: ${databaseOutputs.privateIp}
  Port: 5432
  Main: ${databaseOutputs.temporalDatabaseName}
  Visibility: ${databaseOutputs.temporalVisibilityDatabaseName}
  User: ${databaseOutputs.temporalUserName}

Redis:
  Host: ${redisOutputs.host}
  Port: ${redisOutputs.port}

Google Cloud Storage:
  Knowledge Docs Bucket: ${storageOutputs.knowledgeDocsBucketName}
  Uploads Bucket: ${storageOutputs.uploadsBucketName}
  Artifacts Bucket: ${storageOutputs.artifactsBucketName}

Load Balancer IP: ${staticIp.address}
`
};
