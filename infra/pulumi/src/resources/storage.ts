import * as gcp from "@pulumi/gcp";
import { infrastructureConfig, resourceName, resourceLabels } from "../utils/config";

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
    cors: [
        {
            origins: [
                `https://api.${infrastructureConfig.domain}`,
                `https://app.${infrastructureConfig.domain}`
            ],
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
                age: 90 // Delete artifacts older than 90 days
            }
        }
    ],
    labels: resourceLabels()
});

// Create bucket for knowledge base documents
export const knowledgeDocsBucket = new gcp.storage.Bucket(resourceName("knowledge-docs"), {
    name: `${resourceName("knowledge-docs")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    publicAccessPrevention: "enforced",
    versioning: {
        enabled: true // Enable versioning for document recovery
    },
    lifecycleRules: [
        {
            action: {
                type: "Delete"
            },
            condition: {
                // Keep last 5 versions of each file
                numNewerVersions: 5
            }
        },
        {
            action: {
                type: "Delete"
            },
            condition: {
                // Delete temporary files after 7 days
                age: 7,
                matchesPrefixes: ["temp/"]
            }
        }
    ],
    cors: [
        {
            origins: [
                `https://api.${infrastructureConfig.domain}`,
                `https://app.${infrastructureConfig.domain}`
            ],
            methods: ["GET", "POST", "PUT", "DELETE"],
            responseHeaders: ["Content-Type", "Content-Length"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// Export storage outputs
export const storageOutputs = {
    uploadsBucketName: uploadsBucket.name,
    uploadsBucketUrl: uploadsBucket.url,
    artifactsBucketName: artifactsBucket.name,
    artifactsBucketUrl: artifactsBucket.url,
    knowledgeDocsBucketName: knowledgeDocsBucket.name,
    knowledgeDocsBucketUrl: knowledgeDocsBucket.url
};
