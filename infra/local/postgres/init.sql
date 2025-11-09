-- FlowMaestro Local Development Database Initialization
-- This script sets up the PostgreSQL database for local Docker Compose development

-- Enable pgvector extension for vector embeddings (knowledge base)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create Temporal database (for self-hosted Temporal workflow engine)
CREATE DATABASE temporal;

-- Create Temporal visibility database (required by Temporal)
CREATE DATABASE temporal_visibility;

-- Grant permissions to flowmaestro user
GRANT ALL PRIVILEGES ON DATABASE flowmaestro TO flowmaestro;
GRANT ALL PRIVILEGES ON DATABASE temporal TO flowmaestro;
GRANT ALL PRIVILEGES ON DATABASE temporal_visibility TO flowmaestro;

-- Switch to flowmaestro database and ensure vector extension is available
\c flowmaestro;
CREATE EXTENSION IF NOT EXISTS vector;

-- Note: Application migrations will be run separately via npm run db:migrate
-- This init script only sets up extensions and databases
