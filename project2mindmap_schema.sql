PRAGMA foreign_keys = ON;

CREATE TABLE projects (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	description TEXT, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id)
);

CREATE TABLE tags (
	id VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	color VARCHAR, 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE TABLE ingestion_jobs (
	id VARCHAR NOT NULL, 
	project_id VARCHAR NOT NULL, 
	input_type VARCHAR NOT NULL, 
	input_title VARCHAR, 
	raw_content TEXT NOT NULL, 
	content_hash VARCHAR, 
	status VARCHAR NOT NULL, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_ingestion_status CHECK (status IN ('committed', 'needs-review', 'pending', 'rejected')), 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE nodes (
	id VARCHAR NOT NULL, 
	project_id VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	slug VARCHAR NOT NULL, 
	category VARCHAR NOT NULL, 
	summary TEXT, 
	description TEXT, 
	status VARCHAR NOT NULL, 
	importance VARCHAR NOT NULL, 
	parent_id VARCHAR, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_nodes_project_slug UNIQUE (project_id, slug), 
	CONSTRAINT ck_nodes_category CHECK (category IN ('Clinical Problem', 'Cohort', 'Dataset', 'Evaluation', 'Experiment', 'Grant', 'Implementation', 'Limitation', 'Method', 'Model', 'Open Question', 'Paper', 'Root', 'Running Log', 'Source', 'Writing')), 
	CONSTRAINT ck_nodes_status CHECK (status IN ('active', 'archived', 'completed', 'idea', 'needs-review', 'paused')), 
	CONSTRAINT ck_nodes_importance CHECK (importance IN ('high', 'low', 'medium')), 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
	FOREIGN KEY(parent_id) REFERENCES nodes (id) ON DELETE SET NULL
);

CREATE TABLE sources (
	id VARCHAR NOT NULL, 
	project_id VARCHAR NOT NULL, 
	source_type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	path_or_url TEXT, 
	citation_key VARCHAR, 
	note TEXT, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE TABLE attachments (
	id VARCHAR NOT NULL, 
	node_id VARCHAR NOT NULL, 
	filename VARCHAR NOT NULL, 
	file_type VARCHAR, 
	path TEXT NOT NULL, 
	description TEXT, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	FOREIGN KEY(node_id) REFERENCES nodes (id) ON DELETE CASCADE
);

CREATE TABLE detail_blocks (
	id VARCHAR NOT NULL, 
	node_id VARCHAR NOT NULL, 
	block_type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	content TEXT NOT NULL, 
	sort_order INTEGER NOT NULL, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_detail_block_type CHECK (block_type IN ('current_status', 'evidence', 'implementation_notes', 'limitations', 'next_steps', 'open_questions', 'overview', 'related_files', 'technical_details', 'why_it_matters', 'writing_notes')), 
	FOREIGN KEY(node_id) REFERENCES nodes (id) ON DELETE CASCADE
);

CREATE TABLE edges (
	id VARCHAR NOT NULL, 
	project_id VARCHAR NOT NULL, 
	source_node_id VARCHAR NOT NULL, 
	target_node_id VARCHAR NOT NULL, 
	relation_type VARCHAR NOT NULL, 
	description TEXT, 
	strength VARCHAR NOT NULL, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_edges_project_typed_pair UNIQUE (project_id, source_node_id, target_node_id, relation_type), 
	CONSTRAINT ck_edges_relation_type CHECK (relation_type IN ('belongs_to', 'contrasts_with', 'depends_on', 'derived_from', 'evaluated_on', 'evaluates', 'extends', 'has_limitation', 'has_open_question', 'implemented_by', 'informs', 'limits', 'measured_by', 'part_of', 'related_to', 'supports', 'trained_on', 'uses', 'written_in')), 
	CONSTRAINT ck_edges_strength CHECK (strength IN ('medium', 'strong', 'weak')), 
	FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_node_id) REFERENCES nodes (id) ON DELETE CASCADE, 
	FOREIGN KEY(target_node_id) REFERENCES nodes (id) ON DELETE CASCADE
);

CREATE TABLE extracted_node_candidates (
	id VARCHAR NOT NULL, 
	ingestion_job_id VARCHAR NOT NULL, 
	proposed_node_id VARCHAR, 
	matched_existing_node_id VARCHAR, 
	title VARCHAR NOT NULL, 
	category VARCHAR NOT NULL, 
	summary TEXT, 
	description TEXT, 
	status VARCHAR, 
	importance VARCHAR, 
	confidence FLOAT, 
	action VARCHAR NOT NULL, 
	review_status VARCHAR NOT NULL, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_node_candidate_category CHECK (category IN ('Clinical Problem', 'Cohort', 'Dataset', 'Evaluation', 'Experiment', 'Grant', 'Implementation', 'Limitation', 'Method', 'Model', 'Open Question', 'Paper', 'Root', 'Running Log', 'Source', 'Writing')), 
	CONSTRAINT ck_node_candidate_action CHECK (action IN ('append', 'create', 'update')), 
	CONSTRAINT ck_node_candidate_review CHECK (review_status IN ('approved', 'needs-review', 'pending', 'rejected')), 
	FOREIGN KEY(ingestion_job_id) REFERENCES ingestion_jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(matched_existing_node_id) REFERENCES nodes (id) ON DELETE SET NULL
);

CREATE TABLE node_aliases (
	id VARCHAR NOT NULL, 
	node_id VARCHAR NOT NULL, 
	alias VARCHAR NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_node_alias UNIQUE (node_id, alias), 
	FOREIGN KEY(node_id) REFERENCES nodes (id) ON DELETE CASCADE
);

CREATE TABLE node_sources (
	node_id VARCHAR NOT NULL, 
	source_id VARCHAR NOT NULL, 
	evidence_note TEXT, 
	source_span TEXT, 
	PRIMARY KEY (node_id, source_id), 
	FOREIGN KEY(node_id) REFERENCES nodes (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_id) REFERENCES sources (id) ON DELETE CASCADE
);

CREATE TABLE node_tags (
	node_id VARCHAR NOT NULL, 
	tag_id VARCHAR NOT NULL, 
	PRIMARY KEY (node_id, tag_id), 
	FOREIGN KEY(node_id) REFERENCES nodes (id) ON DELETE CASCADE, 
	FOREIGN KEY(tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE TABLE extracted_detail_candidates (
	id VARCHAR NOT NULL, 
	ingestion_job_id VARCHAR NOT NULL, 
	node_candidate_id VARCHAR, 
	matched_existing_node_id VARCHAR, 
	block_type VARCHAR NOT NULL, 
	title VARCHAR NOT NULL, 
	content TEXT NOT NULL, 
	action VARCHAR NOT NULL, 
	review_status VARCHAR NOT NULL, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_detail_candidate_block_type CHECK (block_type IN ('current_status', 'evidence', 'implementation_notes', 'limitations', 'next_steps', 'open_questions', 'overview', 'related_files', 'technical_details', 'why_it_matters', 'writing_notes')), 
	CONSTRAINT ck_detail_candidate_action CHECK (action IN ('append', 'create', 'update')), 
	CONSTRAINT ck_detail_candidate_review CHECK (review_status IN ('approved', 'needs-review', 'pending', 'rejected')), 
	FOREIGN KEY(ingestion_job_id) REFERENCES ingestion_jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(node_candidate_id) REFERENCES extracted_node_candidates (id) ON DELETE SET NULL, 
	FOREIGN KEY(matched_existing_node_id) REFERENCES nodes (id) ON DELETE SET NULL
);

CREATE TABLE extracted_edge_candidates (
	id VARCHAR NOT NULL, 
	ingestion_job_id VARCHAR NOT NULL, 
	source_title VARCHAR NOT NULL, 
	target_title VARCHAR NOT NULL, 
	source_node_candidate_id VARCHAR, 
	target_node_candidate_id VARCHAR, 
	matched_source_node_id VARCHAR, 
	matched_target_node_id VARCHAR, 
	relation_type VARCHAR NOT NULL, 
	description TEXT, 
	strength VARCHAR NOT NULL, 
	confidence FLOAT, 
	action VARCHAR NOT NULL, 
	review_status VARCHAR NOT NULL, 
	created_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	updated_at VARCHAR DEFAULT CURRENT_TIMESTAMP, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_edge_candidate_relation CHECK (relation_type IN ('belongs_to', 'contrasts_with', 'depends_on', 'derived_from', 'evaluated_on', 'evaluates', 'extends', 'has_limitation', 'has_open_question', 'implemented_by', 'informs', 'limits', 'measured_by', 'part_of', 'related_to', 'supports', 'trained_on', 'uses', 'written_in')), 
	CONSTRAINT ck_edge_candidate_strength CHECK (strength IN ('medium', 'strong', 'weak')), 
	CONSTRAINT ck_edge_candidate_action CHECK (action IN ('append', 'create', 'update')), 
	CONSTRAINT ck_edge_candidate_review CHECK (review_status IN ('approved', 'needs-review', 'pending', 'rejected')), 
	FOREIGN KEY(ingestion_job_id) REFERENCES ingestion_jobs (id) ON DELETE CASCADE, 
	FOREIGN KEY(source_node_candidate_id) REFERENCES extracted_node_candidates (id) ON DELETE SET NULL, 
	FOREIGN KEY(target_node_candidate_id) REFERENCES extracted_node_candidates (id) ON DELETE SET NULL, 
	FOREIGN KEY(matched_source_node_id) REFERENCES nodes (id) ON DELETE SET NULL, 
	FOREIGN KEY(matched_target_node_id) REFERENCES nodes (id) ON DELETE SET NULL
);

CREATE INDEX idx_ingestion_project_status ON ingestion_jobs (project_id, status);
CREATE INDEX idx_nodes_project_updated ON nodes (project_id, updated_at);
CREATE INDEX idx_nodes_project_importance ON nodes (project_id, importance);
CREATE INDEX idx_edges_project_relation ON edges (project_id, relation_type);
