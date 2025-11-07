import * as gcp from "@pulumi/gcp";
import { infrastructureConfig, resourceName, resourceLabels } from "./config";

// Create bucket for frontend static files
export const frontendBucket = new gcp.storage.Bucket(resourceName("frontend"), {
    name: `${resourceName("frontend")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    website: {
        mainPageSuffix: "index.html",
        notFoundPage: "index.html"
    },
    corsRules: [
        {
            origins: ["*"],
            methods: ["GET", "HEAD"],
            responseHeaders: ["*"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// Make frontend bucket publicly readable
new gcp.storage.BucketIAMBinding(resourceName("frontend-public"), {
    bucket: frontendBucket.name,
    role: "roles/storage.objectViewer",
    members: ["allUsers"]
});

// Create bucket for marketing site static files
export const marketingBucket = new gcp.storage.Bucket(resourceName("marketing"), {
    name: `${resourceName("marketing")}-${infrastructureConfig.project}`,
    location: infrastructureConfig.region,
    uniformBucketLevelAccess: true,
    website: {
        mainPageSuffix: "index.html",
        notFoundPage: "index.html"
    },
    corsRules: [
        {
            origins: ["*"],
            methods: ["GET", "HEAD"],
            responseHeaders: ["*"],
            maxAgeSeconds: 3600
        }
    ],
    labels: resourceLabels()
});

// Make marketing bucket publicly readable
new gcp.storage.BucketIAMBinding(resourceName("marketing-public"), {
    bucket: marketingBucket.name,
    role: "roles/storage.objectViewer",
    members: ["allUsers"]
});

// Create backend bucket for Cloud CDN (frontend)
export const frontendBackendBucket = new gcp.compute.BackendBucket(
    resourceName("frontend-backend"),
    {
        name: resourceName("frontend-backend"),
        bucketName: frontendBucket.name,
        enableCdn: true,
        cdnPolicy: {
            cacheMode: "CACHE_ALL_STATIC",
            clientTtl: 3600,
            defaultTtl: 3600,
            maxTtl: 86400,
            negativeCaching: true,
            serveWhileStale: 86400
        }
    }
);

// Create backend bucket for Cloud CDN (marketing)
export const marketingBackendBucket = new gcp.compute.BackendBucket(
    resourceName("marketing-backend"),
    {
        name: resourceName("marketing-backend"),
        bucketName: marketingBucket.name,
        enableCdn: true,
        cdnPolicy: {
            cacheMode: "CACHE_ALL_STATIC",
            clientTtl: 3600,
            defaultTtl: 3600,
            maxTtl: 86400,
            negativeCaching: true,
            serveWhileStale: 86400
        }
    }
);

// Export storage outputs
export const storageOutputs = {
    frontendBucketName: frontendBucket.name,
    frontendBucketUrl: frontendBucket.url,
    marketingBucketName: marketingBucket.name,
    marketingBucketUrl: marketingBucket.url,
    frontendBackendBucketId: frontendBackendBucket.id,
    marketingBackendBucketId: marketingBackendBucket.id
};
