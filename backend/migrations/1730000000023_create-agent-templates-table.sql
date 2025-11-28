-- Migration: Create agent_templates table
-- Description: Stores pre-built agent templates that users can copy to their workspace

CREATE TABLE IF NOT EXISTS flowmaestro.agent_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Agent Definition
    system_prompt TEXT NOT NULL,
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 4000,
    available_tools JSONB DEFAULT '[]'::jsonb,

    -- Categorization (same categories as workflow templates)
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',

    -- Display
    icon VARCHAR(100),
    color VARCHAR(50),

    -- Metadata
    author_name VARCHAR(255),
    author_avatar_url TEXT,

    -- Stats & Ordering
    view_count INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    featured BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,

    -- Integrations Required
    required_integrations TEXT[] DEFAULT '{}',

    -- Versioning
    version VARCHAR(20) DEFAULT '1.0.0',

    -- Status
    status VARCHAR(20) DEFAULT 'active',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP WITH TIME ZONE
);

-- Add check constraint for category values (same as workflow templates)
ALTER TABLE flowmaestro.agent_templates
ADD CONSTRAINT valid_agent_template_category CHECK (
    category IN ('marketing', 'sales', 'operations', 'engineering', 'support')
);

-- Add check constraint for status values
ALTER TABLE flowmaestro.agent_templates
ADD CONSTRAINT valid_agent_template_status CHECK (
    status IN ('active', 'draft', 'deprecated')
);

-- Add check constraint for provider values
ALTER TABLE flowmaestro.agent_templates
ADD CONSTRAINT valid_agent_template_provider CHECK (
    provider IN ('openai', 'anthropic', 'google', 'cohere')
);

-- Add check constraint for temperature range
ALTER TABLE flowmaestro.agent_templates
ADD CONSTRAINT valid_agent_template_temperature CHECK (
    temperature >= 0 AND temperature <= 2
);

-- Indexes for efficient querying
CREATE INDEX idx_agent_templates_category ON flowmaestro.agent_templates(category);
CREATE INDEX idx_agent_templates_status ON flowmaestro.agent_templates(status);
CREATE INDEX idx_agent_templates_featured ON flowmaestro.agent_templates(featured) WHERE featured = true;
CREATE INDEX idx_agent_templates_tags ON flowmaestro.agent_templates USING GIN(tags);
CREATE INDEX idx_agent_templates_integrations ON flowmaestro.agent_templates USING GIN(required_integrations);
CREATE INDEX idx_agent_templates_sort_order ON flowmaestro.agent_templates(sort_order, created_at DESC);
CREATE INDEX idx_agent_templates_provider ON flowmaestro.agent_templates(provider);

-- Full text search index for name and description
CREATE INDEX idx_agent_templates_search ON flowmaestro.agent_templates
USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Comment on table
COMMENT ON TABLE flowmaestro.agent_templates IS 'Pre-built agent templates that users can copy to their workspace';
COMMENT ON COLUMN flowmaestro.agent_templates.category IS 'Template category: marketing, sales, operations, engineering, support';
COMMENT ON COLUMN flowmaestro.agent_templates.tags IS 'Array of tags for filtering (e.g., customer-service, helpdesk, SDR)';
COMMENT ON COLUMN flowmaestro.agent_templates.required_integrations IS 'Array of integration provider IDs required by this agent';
COMMENT ON COLUMN flowmaestro.agent_templates.system_prompt IS 'The agent instructions/persona defining its behavior';
COMMENT ON COLUMN flowmaestro.agent_templates.available_tools IS 'Array of tool definitions showing recommended tools for this agent';
COMMENT ON COLUMN flowmaestro.agent_templates.view_count IS 'Number of times this template has been viewed';
COMMENT ON COLUMN flowmaestro.agent_templates.use_count IS 'Number of times this template has been copied to a workspace';
