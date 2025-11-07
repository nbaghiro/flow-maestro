import * as gcp from "@pulumi/gcp";
import { infrastructureConfig, resourceName, resourceLabels } from "./config";
import { network, privateVpcConnection } from "./networking";

// Create Memorystore Redis instance
export const redis = new gcp.redis.Instance(
    resourceName("redis"),
    {
        name: resourceName("redis"),
        region: infrastructureConfig.region,
        memorySizeGb: infrastructureConfig.redisMemorySizeGb,
        redisVersion: infrastructureConfig.redisVersion,
        tier: infrastructureConfig.redisTier,

        authorizedNetwork: network.id,
        connectMode: "PRIVATE_SERVICE_ACCESS",

        redisConfigs: {
            "maxmemory-policy": "allkeys-lru"
        },

        maintenancePolicy: {
            weeklyMaintenanceWindows: [
                {
                    day: "SUNDAY",
                    startTime: {
                        hours: 3,
                        minutes: 0,
                        seconds: 0,
                        nanos: 0
                    }
                }
            ]
        },

        displayName: `${resourceName("redis")} - ${infrastructureConfig.environment}`,
        labels: resourceLabels()
    },
    {
        dependsOn: [privateVpcConnection]
    }
);

// Export Redis outputs
export const redisOutputs = {
    instanceId: redis.id,
    host: redis.host,
    port: redis.port,
    readEndpoint: redis.readEndpoint,
    currentLocationId: redis.currentLocationId
};
