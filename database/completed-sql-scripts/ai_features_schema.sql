-- AI Features Database Schema
-- This adds AI-powered capabilities to the existing system

-- Update documents table to include AI analysis data
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_data JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS classification_confidence DECIMAL(3,2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ocr_confidence DECIMAL(3,2);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_status VARCHAR(50) DEFAULT 'pending';

-- Create AI insights table to store generated insights
CREATE TABLE IF NOT EXISTS ai_insights (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- compliance, recommendation, risk, opportunity
    severity VARCHAR(20), -- low, medium, high, critical
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    action_required TEXT,
    related_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    related_deadline_id INTEGER REFERENCES document_deadlines(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, resolved, dismissed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    created_by INTEGER REFERENCES auth.users(id)
);

-- Create document duplicates table for tracking potential duplicates
CREATE TABLE IF NOT EXISTS document_duplicates (
    id SERIAL PRIMARY KEY,
    original_document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    duplicate_document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    similarity_score DECIMAL(3,2) NOT NULL,
    similarity_reasons JSONB,
    status VARCHAR(50) DEFAULT 'detected', -- detected, confirmed, dismissed
    reviewed_by INTEGER REFERENCES auth.users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AI processing logs table
CREATE TABLE IF NOT EXISTS ai_processing_logs (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    processing_type VARCHAR(100) NOT NULL, -- ocr, classification, duplicate_detection
    status VARCHAR(50) NOT NULL, -- processing, completed, failed
    confidence_score DECIMAL(3,2),
    processing_time INTEGER, -- in milliseconds
    error_message TEXT,
    result_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create document entities table for extracted structured data
CREATE TABLE IF NOT EXISTS document_entities (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- company_name, registration_number, vat_number, etc.
    entity_value TEXT NOT NULL,
    confidence DECIMAL(3,2),
    extraction_method VARCHAR(50), -- ocr, pattern_matching, ai_classification
    verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES auth.users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create AI recommendations table for system-wide recommendations
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id SERIAL PRIMARY KEY,
    recommendation_type VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    target_audience VARCHAR(50), -- admin, user, client_specific
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE, -- null for system-wide
    implementation_status VARCHAR(50) DEFAULT 'suggested', -- suggested, planned, implemented, dismissed
    business_impact TEXT,
    technical_requirements TEXT,
    estimated_effort VARCHAR(20), -- small, medium, large
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for AI features
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_classification_confidence ON documents(classification_confidence);
CREATE INDEX IF NOT EXISTS idx_documents_processing_status ON documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_client_type ON ai_insights(client_id, insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_document_duplicates_similarity ON document_duplicates(similarity_score);
CREATE INDEX IF NOT EXISTS idx_document_entities_type ON document_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_processing_logs_status ON ai_processing_logs(status);

-- Add RLS policies for AI features
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- AI insights policies
CREATE POLICY "Users can view AI insights for their clients" ON ai_insights
    FOR SELECT USING (
        client_id IN (
            SELECT id FROM clients 
            WHERE created_by = auth.uid() OR auth.uid() IN (
                SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
            )
        )
    );

CREATE POLICY "Users can create AI insights for their clients" ON ai_insights
    FOR INSERT WITH CHECK (
        client_id IN (
            SELECT id FROM clients 
            WHERE created_by = auth.uid() OR auth.uid() IN (
                SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
            )
        )
    );

CREATE POLICY "Users can update AI insights for their clients" ON ai_insights
    FOR UPDATE USING (
        client_id IN (
            SELECT id FROM clients 
            WHERE created_by = auth.uid() OR auth.uid() IN (
                SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
            )
        )
    );

-- Document duplicates policies
CREATE POLICY "Users can view document duplicates for their documents" ON document_duplicates
    FOR SELECT USING (
        original_document_id IN (
            SELECT id FROM documents WHERE client_id IN (
                SELECT id FROM clients 
                WHERE created_by = auth.uid() OR auth.uid() IN (
                    SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
                )
            )
        )
    );

CREATE POLICY "Users can manage document duplicates" ON document_duplicates
    FOR ALL USING (
        original_document_id IN (
            SELECT id FROM documents WHERE client_id IN (
                SELECT id FROM clients 
                WHERE created_by = auth.uid() OR auth.uid() IN (
                    SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
                )
            )
        )
    );

-- AI processing logs policies
CREATE POLICY "Users can view AI processing logs for their documents" ON ai_processing_logs
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE client_id IN (
                SELECT id FROM clients 
                WHERE created_by = auth.uid() OR auth.uid() IN (
                    SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
                )
            )
        )
    );

CREATE POLICY "System can create AI processing logs" ON ai_processing_logs
    FOR INSERT WITH CHECK (true);

-- Document entities policies
CREATE POLICY "Users can view document entities for their documents" ON document_entities
    FOR SELECT USING (
        document_id IN (
            SELECT id FROM documents WHERE client_id IN (
                SELECT id FROM clients 
                WHERE created_by = auth.uid() OR auth.uid() IN (
                    SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
                )
            )
        )
    );

CREATE POLICY "Users can manage document entities" ON document_entities
    FOR ALL USING (
        document_id IN (
            SELECT id FROM documents WHERE client_id IN (
                SELECT id FROM clients 
                WHERE created_by = auth.uid() OR auth.uid() IN (
                    SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
                )
            )
        )
    );

-- AI recommendations policies
CREATE POLICY "Users can view AI recommendations" ON ai_recommendations
    FOR SELECT USING (
        client_id IS NULL OR 
        client_id IN (
            SELECT id FROM clients 
            WHERE created_by = auth.uid() OR auth.uid() IN (
                SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
            )
        )
    );

CREATE POLICY "Admins can manage AI recommendations" ON ai_recommendations
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM auth.users WHERE email IN ('admin@agility.com', 'james@ripcurlsolutions.com')
        )
    );

-- Create functions for AI insights
CREATE OR REPLACE FUNCTION update_ai_insights_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for ai_recommendations updated_at
CREATE TRIGGER update_ai_recommendations_timestamp
    BEFORE UPDATE ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_ai_insights_timestamp();

-- Create function to generate automatic insights when documents are uploaded
CREATE OR REPLACE FUNCTION generate_automatic_insights()
RETURNS TRIGGER AS $$
DECLARE
    client_doc_count INTEGER;
    required_docs TEXT[] := ARRAY['registration_certificate', 'vat_certificate', 'paye_certificate'];
    missing_doc TEXT;
BEGIN
    -- Count documents for this client
    SELECT COUNT(*) INTO client_doc_count
    FROM documents 
    WHERE client_id = NEW.client_id;

    -- Check for missing required documents
    FOREACH missing_doc IN ARRAY required_docs
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM documents 
            WHERE client_id = NEW.client_id 
            AND document_type = missing_doc
        ) THEN
            INSERT INTO ai_insights (
                client_id, 
                insight_type, 
                severity, 
                title, 
                description, 
                action_required
            ) VALUES (
                NEW.client_id,
                'compliance',
                'high',
                'Missing Required Document',
                'Client is missing ' || replace(missing_doc, '_', ' ') || ' which is required for compliance',
                'Upload the missing document to ensure regulatory compliance'
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- Generate recommendation for document organization if many documents
    IF client_doc_count > 10 AND NOT EXISTS (
        SELECT 1 FROM ai_insights 
        WHERE client_id = NEW.client_id 
        AND insight_type = 'recommendation' 
        AND title LIKE '%document organization%'
    ) THEN
        INSERT INTO ai_insights (
            client_id,
            insight_type,
            severity,
            title,
            description,
            action_required
        ) VALUES (
            NEW.client_id,
            'recommendation',
            'medium',
            'Improve Document Organization',
            'This client has many documents. Consider adding descriptions and tags for better organization.',
            'Add descriptions and organize documents into folders'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for automatic insight generation
CREATE TRIGGER trigger_generate_automatic_insights
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION generate_automatic_insights();

-- Create view for AI dashboard summary
CREATE OR REPLACE VIEW ai_dashboard_summary AS
SELECT 
    COUNT(*) as total_documents,
    COUNT(CASE WHEN document_type IS NOT NULL AND document_type != 'other' THEN 1 END) as classified_documents,
    COUNT(CASE WHEN extracted_text IS NOT NULL AND extracted_text != '' THEN 1 END) as ocr_processed,
    COUNT(CASE WHEN classification_confidence >= 0.8 THEN 1 END) as high_confidence_classifications,
    AVG(classification_confidence) as avg_classification_confidence,
    COUNT(CASE WHEN processing_status = 'completed' THEN 1 END) as processing_completed,
    (SELECT COUNT(*) FROM ai_insights WHERE status = 'active') as active_insights,
    (SELECT COUNT(*) FROM document_duplicates WHERE status = 'detected') as potential_duplicates
FROM documents;

-- Insert sample AI recommendations for system improvement
INSERT INTO ai_recommendations (
    recommendation_type,
    title,
    description,
    priority,
    target_audience,
    business_impact,
    technical_requirements,
    estimated_effort
) VALUES 
(
    'system_enhancement',
    'Implement Automated Document Categorization',
    'Add machine learning models to automatically categorize uploaded documents with higher accuracy',
    'high',
    'admin',
    'Reduce manual document sorting time by 80% and improve data consistency',
    'Integration with ML services, model training infrastructure',
    'large'
),
(
    'workflow_optimization',
    'Smart Deadline Predictions',
    'Use AI to predict document deadlines based on document type and client history',
    'medium',
    'admin',
    'Proactive deadline management, reduced compliance risks',
    'Historical data analysis, predictive modeling',
    'medium'
),
(
    'user_experience',
    'Intelligent Document Search',
    'Implement semantic search to find documents by content, not just filename',
    'medium',
    'user',
    'Faster document retrieval, improved productivity',
    'Search engine integration, document indexing',
    'medium'
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_insights TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_duplicates TO authenticated;
GRANT SELECT, INSERT ON ai_processing_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_entities TO authenticated;
GRANT SELECT ON ai_recommendations TO authenticated;
GRANT ALL ON ai_dashboard_summary TO authenticated;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE ai_insights IS 'Stores AI-generated insights for compliance, risks, and recommendations';
COMMENT ON TABLE document_duplicates IS 'Tracks potential duplicate documents detected by AI';
COMMENT ON TABLE ai_processing_logs IS 'Logs all AI processing activities for auditing';
COMMENT ON TABLE document_entities IS 'Stores structured data extracted from documents';
COMMENT ON TABLE ai_recommendations IS 'System-wide AI recommendations for improvements';
COMMENT ON VIEW ai_dashboard_summary IS 'Summary statistics for AI dashboard';