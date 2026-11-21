# Backend test ledger

Every collected pytest test function is listed below. BT-01..BT-12 identify the representative guide coverage requested for this implementation; each ID points to an executable test. Feature-step numbers follow the coding plan. Full backend result on 2026-11-22: 152 passed, 0 failed. RAG regression: 11 passed, 0 failed.

| BT ID | Test | Requirement | Feature step | Result |
|---|---|---|---:|---|
| ? | `tests/test_admin_provisioning.py::test_admin_cli_provisioning_creates_admin_and_consent_record` | FR-22, FR-27, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_provisioning.py::test_admin_cli_provisioning_refuses_existing_email` | FR-22, FR-27, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_admin_queue_is_admin_only_and_contains_signals_without_contact_details` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| BT-06 | `tests/test_admin_verification.py::test_admin_approves_appeal_records_reviewer_and_makes_status_visible` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_admin_requires_nonblank_reason_and_rejects_forbidden_second_transition` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_admin_rejection_is_final_and_records_reviewer_reason` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_denied_appeal_is_final_and_cannot_be_appealed_again` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_reported_profile_returns_to_queue_with_score_locked` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_admin_decision_history_filters_paginates_and_exposes_audited_fields` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_admin_verification.py::test_admin_stats_counts_roles_queue_appeals_and_recent_decisions` | FR-15, FR-16, FR-21, FR-26 | 3 | PASS (full backend suite, 2026-11-22) |
| BT-01 | `tests/test_auth.py::test_register_and_login_founder` | FR-22, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth.py::test_protected_me_endpoint_requires_token` | FR-22, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth.py::test_admin_route_rejects_non_admin_role` | FR-22, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth.py::test_expired_or_invalid_token_is_rejected` | FR-22, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_registration_requires_explicit_consent_and_does_not_create_user` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_registration_role_is_in_path_and_admin_cannot_be_selected` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_consent_can_be_withdrawn_without_exposing_password_or_token` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_deletion_request_disables_account_invalidates_token_and_clears_llm_cache` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_fake_linkedin_provider_creates_identity_and_reuses_it` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_linkedin_provider_configuration_rejects_unavailable_provider` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_consent_withdrawal_backfills_missing_record_as_withdrawn` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_withdrawn_consent_blocks_new_processing_but_keeps_own_reads_and_deletion` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_consent_oauth.py::test_cors_preflight_allows_configured_origin_and_rejects_other_origin` | FR-17, FR-22, FR-27, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_sessions.py::test_public_registration_cannot_create_an_admin` | FR-22, FR-27, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_sessions.py::test_registration_validation_does_not_echo_the_submitted_password` | FR-22, FR-27, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_sessions.py::test_logout_invalidates_all_tokens_issued_before_logout` | FR-22, FR-27, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_auth_sessions.py::test_expired_token_is_rejected` | FR-22, FR-27, NFR-4, NFR-5 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_background_tasks.py::test_profile_embedding_task_regenerates_with_current_model` | FR-7, FR-27, NFR-2, NFR-11, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_background_tasks.py::test_account_purge_removes_due_user_data_and_private_resume_and_cache` | FR-7, FR-27, NFR-2, NFR-11, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_background_tasks.py::test_celery_tasks_are_registered_without_running_a_worker` | FR-7, FR-27, NFR-2, NFR-11, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| BT-09 | `tests/test_background_tasks.py::test_embedding_regeneration_is_idempotent_and_batches_stale_profiles` | FR-7, FR-27, NFR-2, NFR-11, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_background_tasks.py::test_corpus_index_task_wraps_existing_entry_point` | FR-7, FR-27, NFR-2, NFR-11, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_api.py::test_compliance_questions_require_a_token` | FR-5, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_api.py::test_only_founders_can_submit_compliance_questions` | FR-5, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_api.py::test_founder_question_returns_structured_answer_and_citations` | FR-5, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_api.py::test_provider_failure_returns_generic_503_without_internal_details` | FR-5, NFR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_supported_answer_is_saved_with_its_citation` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_case_specific_license_question_abstains_before_embedding_or_generation` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_invalid_citation_or_failed_grounding_validation_abstains` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_retrieval_below_threshold_abstains_without_calling_gateway` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_empty_structured_answer_is_recorded_as_abstention` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_unrelated_question_with_no_indexed_corpus_is_saved_as_abstention` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_what_is_secp_retrieves_manifested_position_paper_and_logs_counts` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_retrieval_error_is_logged_and_failed_query_is_recorded` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_gemini_error_is_logged_and_failed_query_is_recorded` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_gateway_generation_failure_is_logged_once_and_failed_query_is_saved` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_assistant.py::test_failed_query_write_does_not_mask_original_provider_error` | FR-5, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_models.py::test_compliance_tables_build_on_sqlite_for_local_tests` | FR-5, NFR-22 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_retrieval.py::test_empty_index_reports_no_active_documents_or_embeddings` | FR-5, NFR-20 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_compliance_retrieval.py::test_retrieval_returns_only_active_chunks_from_configured_model` | FR-5, NFR-20 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_settings_load_repository_root_env_and_use_documented_embedding_default` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_settings_accept_documented_jwt_names_and_psycopg3_url` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_settings_provide_bounded_gemini_request_timeout` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_settings_read_optional_gemini_fallback_model` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_cors_settings_reject_wildcard_with_credentials` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_verification_settings_load_versioned_config_and_validate_weights` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_production_requires_long_nondefault_jwt_secret` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_newer_gemini_primary_model_logs_policy_warning` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_newer_gemini_fallback_model_logs_policy_warning` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_config.py::test_gemini_default_uses_approved_25_flash_model` | NFR-19, NFR-21, NFR-22 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_corpus_indexer.py::test_companies_act_scope_keeps_allowed_parts_and_sections` | FR-5, NFR-12, NFR-14, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_corpus_indexer.py::test_income_tax_scope_keeps_only_manifested_sections_and_division` | FR-5, NFR-12, NFR-14, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| BT-11 | `tests/test_corpus_indexer.py::test_indexer_verifies_and_persists_text_source_chunks` | FR-5, NFR-12, NFR-14, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_corpus_indexer.py::test_indexer_repairs_missing_chunks_and_null_embeddings_without_duplicates` | FR-5, NFR-12, NFR-14, NFR-20 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_feature_ai.py::test_gateway_receives_configured_fallback_model` | NFR-8, NFR-19 | 4 | PASS (full backend suite, 2026-11-22) |
| BT-02 | `tests/test_founder_profiles.py::test_founder_can_save_consented_profile_and_startup_traction` | FR-2, FR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_founder_profiles.py::test_founder_profile_requires_explicit_consent` | FR-2, FR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_founder_profiles.py::test_non_founder_cannot_write_founder_profile` | FR-2, FR-4, NFR-9 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_infrastructure.py::test_celery_uses_configured_redis_url` | NFR-2, NFR-19, NFR-21, NFR-23 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_infrastructure.py::test_celery_app_has_json_safe_worker_defaults` | NFR-2, NFR-19, NFR-21, NFR-23 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_infrastructure.py::test_celery_schedules_due_account_purges` | NFR-2, NFR-19, NFR-21, NFR-23 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_infrastructure.py::test_compose_declares_database_redis_api_worker_and_beat_services` | NFR-2, NFR-19, NFR-21, NFR-23 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_infrastructure.py::test_openapi_export_contains_existing_api_routes` | NFR-2, NFR-19, NFR-21, NFR-23 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_infrastructure.py::test_unhandled_exception_returns_generic_500_and_logs_server_side` | NFR-2, NFR-19, NFR-21, NFR-23 | 4 | PASS (full backend suite, 2026-11-22) |
| BT-03 | `tests/test_intelligence.py::test_matching_explanation_and_contact_require_both_acceptances` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_unverified_mentor_is_hidden_and_profile_edits_return_it_to_review` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_availability_only_profile_edit_keeps_verified_status_but_substantive_edit_resets_it` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| BT-10 | `tests/test_intelligence.py::test_matching_request_can_be_accepted_to_reveal_contacts` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_matching_recipient_can_decline_without_contact_reveal` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_closed_mentor_is_not_recommended` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| BT-08 | `tests/test_intelligence.py::test_bt08_matching_hard_filters_apply_before_weighted_ranking` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_talent_profiles_can_match_with_founders` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_matching_limits_results_to_requested_top_k` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_closed_mentor_does_not_consume_founder_match_page_limit` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_withdrawn_user_is_excluded_from_new_match_candidates` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_inactive_candidate_is_not_returned_in_founder_match_list` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_postgres_candidate_filters_are_applied_before_similarity_limit` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_investors_only_see_verified_startups_with_readiness` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_readiness_stores_all_seven_dimensions_and_history` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_pitch_keeps_transcript_and_only_scores_when_finished` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_pitch_generation_failure_preserves_founder_answer` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_intelligence.py::test_pitch_can_be_marked_incomplete_without_a_final_score` | FR-3, FR-7, FR-10, FR-13, FR-28, FR-29, NFR-3, NFR-5, NFR-6 | 1 | PASS (full backend suite, 2026-11-22) |
| BT-04 | `tests/test_jobs.py::test_verified_founder_and_talent_complete_listing_application_flow` | FR-6, FR-24, FR-25, NFR-5, NFR-22 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_jobs.py::test_unverified_or_non_owner_founder_cannot_manage_job_listings` | FR-6, FR-24, FR-25, NFR-5, NFR-22 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_jobs.py::test_open_listing_cannot_be_saved_after_startup_loses_verification` | FR-6, FR-24, FR-25, NFR-5, NFR-22 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_jobs.py::test_job_listing_rejects_whitespace_only_required_fields_on_create_and_patch` | FR-6, FR-24, FR-25, NFR-5, NFR-22 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_requests_structured_evidence_bound_answer_and_validation` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_closes_its_client` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_configures_timeout_and_bounded_transient_retries` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_propagates_provider_errors_to_compliance_service` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_logs_and_propagates_timeout_without_prompt_contents` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_retries_504_once_and_logs_each_attempt` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_uses_only_an_explicit_configured_fallback` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_uses_fallback_only_after_primary_retry_fails` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_does_not_retry_quota_errors` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_minimal_diagnostic_uses_no_retrieved_evidence` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_bounds_oversized_and_duplicate_evidence_context` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_structured_generation_caches_by_user_input_and_prompt_version` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_structured_cache_expiry_forces_provider_call` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_structured_cache_clear_removes_only_the_requested_scope` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_compliance_generation_does_not_use_structured_response_cache` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_generation_queue_records_waiting_position` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_llm_gateway.py::test_gateway_call_metadata_is_persisted_without_prompt_content` | FR-5, NFR-2, NFR-8, NFR-11, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_firecrawl_search_sends_bounded_web_search_and_parses_evidence` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_firecrawl_rejects_malformed_search_response` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_firecrawl_provider_failure_is_sanitized` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_market_research_keeps_evidence_separate_and_stores_history` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_market_research_with_no_search_results_abstains_without_llm_call` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_market_research_rejects_unknown_citation_and_keeps_evidence_log` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_market_research_failure_preserves_search_evidence_and_hides_provider_error` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_market_research.py::test_market_research_is_founder_only_and_startup_owned` | FR-23, NFR-8, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_migrations.py::test_migrations_build_user_schema_from_empty_database` | NFR-22 | 5 | PASS (full backend suite, 2026-11-22) |
| BT-12 | `tests/test_migrations.py::test_migrations_upgrade_head_then_downgrade_base_on_empty_sqlite` | NFR-22 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_migrations.py::test_match_request_migration_backfills_existing_acceptance_flags` | NFR-22 | 5 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_portfolio_verification.py::test_portfolio_fetch_uses_configured_provider_and_caps_extracted_content` | FR-12, FR-15, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_portfolio_verification.py::test_portfolio_fetch_errors_are_sanitized` | FR-12, FR-15, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_profiles_verification_step4.py::test_talent_profile_stores_optional_github_link_and_requires_talent_role` | FR-12, FR-13, FR-19, FR-20 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_profiles_verification_step4.py::test_talent_verification_stores_all_five_signals_and_only_calls_gateway_for_link` | FR-12, FR-13, FR-19, FR-20 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_profiles_verification_step4.py::test_verified_secp_and_complete_signals_can_auto_verify` | FR-12, FR-13, FR-19, FR-20 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_rate_limits.py::test_register_limit_returns_generic_429_without_internals` | NFR-19 | 4 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_optimizer_stores_private_pdf_and_returns_validated_line_edits` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_upload_requires_processing_consent` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_upload_rejects_wrong_mime_or_pdf_signature` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_rejects_empty_text_and_oversized_upload` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_generation_failure_is_logged_without_returning_fake_suggestions` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_rejects_model_edits_that_do_not_match_source_lines` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_schema_failure_logs_only_validation_location_and_type` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_history_and_delete_are_scoped_to_owner` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_storage_rejects_served_and_unignored_repo_paths` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_resume_optimizer.py::test_resume_upload_openapi_documents_raw_pdf_body` | FR-18, NFR-4, NFR-9, NFR-19 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_startup_verification.py::test_only_owner_requests_and_admin_approval_unlocks_job_posting` | FR-24, FR-26 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_startup_verification.py::test_startup_verification_queue_and_decision_require_admin` | FR-24, FR-26 | 1 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_profile_flow_scores_saves_status_and_requires_manual_secp_review` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_auto_rejected_profile_can_appeal_once_and_report_locks_rescoring` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_verification_requires_role_consent_profile_and_https_portfolio` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_portfolio_provider_failure_does_not_create_a_successful_verification` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_empty_portfolio_page_is_insufficient_and_does_not_claim_a_match` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_thresholds_must_be_ordered` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_stored_signal_rows_reproduce_total_score_for_mentor_investor_and_talent` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| BT-05 | `tests/test_verification.py::test_complete_consistent_profile_auto_verifies_without_linkedin_and_incomplete_stays_pending` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| ? | `tests/test_verification.py::test_report_and_block_preserve_rejected_and_appeal_pending_states` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
| BT-07 | `tests/test_verification.py::test_block_moves_verified_profile_to_review_and_locks_rescore` | FR-12, FR-14, FR-15, FR-16, FR-19, FR-20, NFR-15 | 2 | PASS (full backend suite, 2026-11-22) |
