-- Add new feedback columns for extended survey questions
ALTER TABLE public.beta_feedback
ADD COLUMN IF NOT EXISTS usage_frequency text,
ADD COLUMN IF NOT EXISTS usage_moment text,
ADD COLUMN IF NOT EXISTS problem_to_solve text,
ADD COLUMN IF NOT EXISTS found_confusing boolean,
ADD COLUMN IF NOT EXISTS ease_of_use integer,
ADD COLUMN IF NOT EXISTS previous_management text,
ADD COLUMN IF NOT EXISTS uses_similar_app boolean,
ADD COLUMN IF NOT EXISTS similar_app_name text,
ADD COLUMN IF NOT EXISTS pay_features text[],
ADD COLUMN IF NOT EXISTS pay_features_other text,
ADD COLUMN IF NOT EXISTS experience_level text;

-- Add comment for documentation
COMMENT ON COLUMN public.beta_feedback.usage_frequency IS 'daily, weekly, monthly, sessions_only';
COMMENT ON COLUMN public.beta_feedback.usage_moment IS 'during_session, after_analysis, future_planning, history_only';
COMMENT ON COLUMN public.beta_feedback.problem_to_solve IS 'Open text: what problem Astroboard helps solve';
COMMENT ON COLUMN public.beta_feedback.found_confusing IS 'Whether user found something confusing in the design';
COMMENT ON COLUMN public.beta_feedback.ease_of_use IS 'Scale 1-5: 1=very easy, 5=very difficult';
COMMENT ON COLUMN public.beta_feedback.previous_management IS 'excel, dedicated_apps, loose_notes, no_tracking';
COMMENT ON COLUMN public.beta_feedback.uses_similar_app IS 'Whether user uses a similar app';
COMMENT ON COLUMN public.beta_feedback.similar_app_name IS 'Name of the similar app if uses_similar_app is true';
COMMENT ON COLUMN public.beta_feedback.pay_features IS 'Array of features that would make user pay: advanced_analysis, integrations, mobile_app, cloud_sync, export_advanced';
COMMENT ON COLUMN public.beta_feedback.pay_features_other IS 'Other feature text if selected';
COMMENT ON COLUMN public.beta_feedback.experience_level IS 'beginner, intermediate, advanced, professional';