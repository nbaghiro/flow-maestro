import * as gcp from "@pulumi/gcp";
import * as pulumi from "@pulumi/pulumi";
import { infrastructureConfig, resourceName, resourceLabels } from "./config";
import { network, privateVpcConnection } from "./networking";

// Create Cloud SQL PostgreSQL instance
export const database = new gcp.sql.DatabaseInstance(
    resourceName("db"),
    {
        name: resourceName("db"),
        region: infrastructureConfig.region,
        databaseVersion: infrastructureConfig.dbVersion,
        deletionProtection: infrastructureConfig.environment === "production",

        settings: {
            tier: infrastructureConfig.dbTier,
            diskSize: infrastructureConfig.dbDiskSize,
            diskType: "PD_SSD",
            diskAutoresize: true,
            diskAutoresizeLimit: 500,

            availabilityType: infrastructureConfig.dbHighAvailability ? "REGIONAL" : "ZONAL",

            ipConfiguration: {
                ipv4Enabled: false,
                privateNetwork: network.id,
                enablePrivatePathForGoogleCloudServices: true
            },

            backupConfiguration: infrastructureConfig.dbBackupEnabled
                ? {
                      enabled: true,
                      startTime: "03:00",
                      pointInTimeRecoveryEnabled: true,
                      transactionLogRetentionDays: 7,
                      backupRetentionSettings: {
                          retainedBackups: 7,
                          retentionUnit: "COUNT"
                      }
                  }
                : undefined,

            maintenanceWindow: {
                day: 7, // Sunday
                hour: 3,
                updateTrack: "stable"
            },

            insightsConfig: {
                queryInsightsEnabled: true,
                queryPlansPerMinute: 5,
                queryStringLength: 1024,
                recordApplicationTags: true,
                recordClientAddress: true
            },

            userLabels: resourceLabels()
        }
    },
    {
        dependsOn: [privateVpcConnection]
    }
);

// Create database
export const databaseName = new gcp.sql.Database(resourceName("database"), {
    name: "flowmaestro",
    instance: database.name,
    charset: "UTF8",
    collation: "en_US.UTF8"
});

// Create database user
export const databaseUser = new gcp.sql.User(resourceName("db-user"), {
    name: "flowmaestro",
    instance: database.name,
    password: infrastructureConfig.dbPassword
});

// Export database outputs
export const databaseOutputs = {
    instanceName: database.name,
    instanceConnectionName: database.connectionName,
    privateIp: database.privateIpAddress,
    databaseName: databaseName.name,
    userName: databaseUser.name
};

// Export database connection string for Kubernetes
export const databaseConnectionString = pulumi.interpolate`postgresql://${databaseUser.name}:${infrastructureConfig.dbPassword}@${database.privateIpAddress}:5432/${databaseName.name}`;
