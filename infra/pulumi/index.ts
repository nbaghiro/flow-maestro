import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig } from "./config";
import { networkOutputs, staticIp } from "./networking";
import { databaseOutputs, databaseConnectionString } from "./database";
import { redisOutputs } from "./redis";
import { clusterOutputs } from "./gke-cluster";
import { secretOutputs } from "./secrets";
import { storageOutputs } from "./storage";
import { monitoringOutputs } from "./monitoring";

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

    // Database
    databaseInstanceName: databaseOutputs.instanceName,
    databaseConnectionName: databaseOutputs.instanceConnectionName,
    databasePrivateIp: databaseOutputs.privateIp,
    databaseName: databaseOutputs.databaseName,
    databaseUser: databaseOutputs.userName,
    databaseConnectionString: databaseConnectionString,

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
    frontendBucketName: storageOutputs.frontendBucketName,
    frontendBucketUrl: storageOutputs.frontendBucketUrl,
    marketingBucketName: storageOutputs.marketingBucketName,
    marketingBucketUrl: storageOutputs.marketingBucketUrl,

    // Monitoring
    dashboardId: monitoringOutputs.dashboardId,

    // Temporal Cloud Configuration
    temporalNamespace: infrastructureConfig.temporalNamespace,
    temporalAddress: infrastructureConfig.temporalAddress,

    // Instructions for next steps
    nextSteps: pulumi.interpolate`
FlowMaestro Infrastructure Deployed Successfully!

Next Steps:
===========

1. Configure kubectl:
   $ pulumi stack output kubeconfig > kubeconfig.yaml
   $ export KUBECONFIG=./kubeconfig.yaml
   $ kubectl get nodes

2. Configure DNS records for your domain (${infrastructureConfig.domain}):
   - api.${infrastructureConfig.domain} -> ${staticIp.address}
   - app.${infrastructureConfig.domain} -> ${staticIp.address}
   - www.${infrastructureConfig.domain} -> ${staticIp.address}

3. Build and push Docker images:
   $ export IMAGE_TAG=$(git rev-parse --short HEAD)
   $ export REGISTRY="${infrastructureConfig.region}-docker.pkg.dev/${infrastructureConfig.project}/flowmaestro"

   # Create Artifact Registry repository
   $ gcloud artifacts repositories create flowmaestro \\
       --repository-format=docker \\
       --location=${infrastructureConfig.region}

   # Build and push backend
   $ docker build -f backend/Dockerfile -t $REGISTRY/backend:$IMAGE_TAG .
   $ docker push $REGISTRY/backend:$IMAGE_TAG

   # Build and push frontend
   $ docker build -f frontend/Dockerfile \\
       --build-arg VITE_API_URL=https://api.${infrastructureConfig.domain} \\
       --build-arg VITE_WS_URL=wss://api.${infrastructureConfig.domain} \\
       -t $REGISTRY/frontend:$IMAGE_TAG .
   $ docker push $REGISTRY/frontend:$IMAGE_TAG

4. Create Kubernetes secrets:
   $ kubectl create namespace flowmaestro

   # Database credentials
   $ kubectl create secret generic db-credentials \\
       --namespace=flowmaestro \\
       --from-literal=host=${databaseOutputs.privateIp} \\
       --from-literal=port=5432 \\
       --from-literal=database=${databaseOutputs.databaseName} \\
       --from-literal=user=${databaseOutputs.userName} \\
       --from-literal=password='<from-pulumi-config>'

   # Redis credentials
   $ kubectl create secret generic redis-credentials \\
       --namespace=flowmaestro \\
       --from-literal=host=${redisOutputs.host} \\
       --from-literal=port=${redisOutputs.port}

   # Application secrets
   $ kubectl create secret generic app-secrets \\
       --namespace=flowmaestro \\
       --from-literal=jwt-secret='<from-pulumi-config>' \\
       --from-literal=encryption-key='<from-pulumi-config>'

   # Temporal credentials
   $ kubectl create secret generic temporal-credentials \\
       --namespace=flowmaestro \\
       --from-literal=address='${infrastructureConfig.temporalAddress}' \\
       --from-literal=namespace='${infrastructureConfig.temporalNamespace}' \\
       --from-file=ca-cert=temporal-ca.pem \\
       --from-file=client-cert=temporal-client.pem \\
       --from-file=client-key=temporal-client-key.pem

5. Run database migrations:
   $ kubectl apply -f k8s/jobs/db-migration.yaml
   $ kubectl logs -f job/db-migration -n flowmaestro

6. Deploy applications:
   $ kubectl apply -k k8s/overlays/production

7. Wait for SSL certificate (15-60 minutes):
   $ kubectl describe managedcertificate flowmaestro-cert -n flowmaestro

8. Verify deployment:
   $ kubectl get pods -n flowmaestro
   $ kubectl get ingress -n flowmaestro

9. Access monitoring dashboard:
   https://console.cloud.google.com/monitoring/dashboards/custom/${monitoringOutputs.dashboardId}

Database Connection:
  Host: ${databaseOutputs.privateIp}
  Port: 5432
  Database: ${databaseOutputs.databaseName}
  User: ${databaseOutputs.userName}

Redis Connection:
  Host: ${redisOutputs.host}
  Port: ${redisOutputs.port}

Load Balancer IP: ${staticIp.address}
`,
};
