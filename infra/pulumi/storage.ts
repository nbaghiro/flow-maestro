import * as gcp from "@pulumi/gcp";
import { infrastructureConfig, resourceName, resourceLabels } from "./config";

// Note: Frontend and marketing are served from Kubernetes, not Cloud Storage
// This file creates buckets for user-uploaded files and assets

// Create bucket for user uploads (PDFs, images, etc.)
export const uploadsBucket = new gcp.storage.Bucket(resourceName("uploads"), {
    name: `${resourceName("uploads")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    versioning: {
        enabled: true
    },
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                numNewerVersions: 3
            }
        }
    ],
    corsRules: [
        {
            origins: [`https://api.${infrastructureConfig.domain}`, `https://app.${infrastructureConfig.domain}`],
            methods: ["GET", "POST", "PUT", "DELETE"],
            responseHeaders: ["Content-Type"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// Create bucket for workflow execution artifacts
export const artifactsBucket = new gcp.storage.Bucket(resourceName("artifacts"), {
    name: `${resourceName("artifacts")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                age: 90  // Delete artifacts older than 90 days
            }
        }
    ],
    labels: resourceLabels()
});

// Export storage outputs
export const storageOutputs = {
    uploadsBucketName: uploadsBucket.name,
    uploadsBucketUrl: uploadsBucket.url,
    artifactsBucketName: artifactsBucket.name,
    artifactsBucketUrl: artifactsBucket.url
};
