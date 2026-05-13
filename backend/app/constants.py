NODE_CATEGORIES = {
    "Root",
    "Clinical Problem",
    "Dataset",
    "Cohort",
    "Model",
    "Method",
    "Experiment",
    "Implementation",
    "Evaluation",
    "Writing",
    "Grant",
    "Paper",
    "Limitation",
    "Open Question",
    "Running Log",
    "Source",
}

NODE_STATUSES = {"idea", "active", "paused", "completed", "needs-review", "archived"}
IMPORTANCE_VALUES = {"low", "medium", "high"}

RELATION_TYPES = {
    "belongs_to",
    "part_of",
    "uses",
    "trained_on",
    "evaluated_on",
    "depends_on",
    "extends",
    "contrasts_with",
    "supports",
    "limits",
    "informs",
    "implemented_by",
    "measured_by",
    "derived_from",
    "evaluates",
    "has_limitation",
    "has_open_question",
    "written_in",
    "related_to",
}

DETAIL_BLOCK_TYPES = {
    "overview",
    "why_it_matters",
    "technical_details",
    "current_status",
    "open_questions",
    "limitations",
    "next_steps",
    "related_files",
    "evidence",
    "implementation_notes",
    "writing_notes",
}

EDGE_STRENGTHS = {"weak", "medium", "strong"}
CANDIDATE_ACTIONS = {"create", "update", "append"}
CANDIDATE_REVIEW_STATUSES = {"pending", "approved", "rejected", "needs-review"}
INGESTION_STATUSES = {"pending", "committed", "rejected", "needs-review"}
