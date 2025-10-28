import dotenv from "dotenv";
import path from "path";

// Load .env from project root
// When compiled, this will be in dist/, so we go up to backend/, then to project root
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const config = {
    server: {
        port: parseInt(process.env.BACKEND_PORT || "3001"),
        host: process.env.BACKEND_HOST || "0.0.0.0"
    },
    database: {
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5432"),
        database: process.env.POSTGRES_DB || "flowmaestro",
        user: process.env.POSTGRES_USER || "flowmaestro",
        password: process.env.POSTGRES_PASSWORD || "flowmaestro_dev_password"
    },
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379")
    },
    jwt: {
        secret: process.env.JWT_SECRET || "your-secret-key-change-this-in-production",
        expiresIn: "100y" // Essentially indefinite - sessions only expire on manual logout
    },
    cors: {
        origin: process.env.CORS_ORIGIN || ["http://localhost:5173", "http://localhost:3000"],
        credentials: true
    },
    env: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info"
};
