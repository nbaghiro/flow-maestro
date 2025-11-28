-- Migration: Create workflow_templates table
-- Description: Stores pre-built workflow templates that users can copy to their workspace

CREATE TABLE IF NOT EXISTS flowmaestro.workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Workflow Definition (same structure as workflows)
    definition JSONB NOT NULL,

    -- Categorization
    category VARCHAR(100) NOT NULL,
    tags TEXT[] DEFAULT '{}',

    -- Display
    icon VARCHAR(100),
    color VARCHAR(50),
    preview_image_url TEXT,

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

-- Add check constraint for category values
ALTER TABLE flowmaestro.workflow_templates
ADD CONSTRAINT valid_template_category CHECK (
    category IN ('marketing', 'sales', 'operations', 'engineering', 'support', 'ecommerce', 'saas', 'healthcare')
);

-- Add check constraint for status values
ALTER TABLE flowmaestro.workflow_templates
ADD CONSTRAINT valid_template_status CHECK (
    status IN ('active', 'draft', 'deprecated')
);

-- Indexes for efficient querying
CREATE INDEX idx_templates_category ON flowmaestro.workflow_templates(category);
CREATE INDEX idx_templates_status ON flowmaestro.workflow_templates(status);
CREATE INDEX idx_templates_featured ON flowmaestro.workflow_templates(featured) WHERE featured = true;
CREATE INDEX idx_templates_tags ON flowmaestro.workflow_templates USING GIN(tags);
CREATE INDEX idx_templates_integrations ON flowmaestro.workflow_templates USING GIN(required_integrations);
CREATE INDEX idx_templates_sort_order ON flowmaestro.workflow_templates(sort_order, created_at DESC);

-- Full text search index for name and description
CREATE INDEX idx_templates_search ON flowmaestro.workflow_templates
USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Comment on table
COMMENT ON TABLE flowmaestro.workflow_templates IS 'Pre-built workflow templates that users can copy to their workspace';
COMMENT ON COLUMN flowmaestro.workflow_templates.category IS 'Template category: marketing, sales, operations, engineering, support, ecommerce, saas, healthcare';
COMMENT ON COLUMN flowmaestro.workflow_templates.tags IS 'Array of tags for filtering (e.g., hubspot, slack, lead-generation)';
COMMENT ON COLUMN flowmaestro.workflow_templates.required_integrations IS 'Array of integration IDs required by this template';
COMMENT ON COLUMN flowmaestro.workflow_templates.view_count IS 'Number of times this template has been viewed';
COMMENT ON COLUMN flowmaestro.workflow_templates.use_count IS 'Number of times this template has been copied to a workspace';
