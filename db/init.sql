CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS device_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    device_index INTEGER DEFAULT 0,
    gain FLOAT,
    sample_rate INTEGER DEFAULT 2048000,
    ppm_correction INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    start_freq BIGINT NOT NULL,
    end_freq BIGINT NOT NULL,
    bin_size INTEGER NOT NULL,
    interval INTEGER NOT NULL,
    gain FLOAT,
    device_index INTEGER DEFAULT 0,
    ppm_correction INTEGER DEFAULT 0,
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    output_file TEXT,
    celery_task_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spectrum_readings (
    time TIMESTAMPTZ NOT NULL,
    job_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
    hz_low BIGINT NOT NULL,
    hz_high BIGINT NOT NULL,
    hz_step FLOAT NOT NULL,
    db_values FLOAT[] NOT NULL
);

SELECT create_hypertable('spectrum_readings', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_spectrum_job_time ON spectrum_readings (job_id, time DESC);

CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
    prompt_template TEXT NOT NULL,
    custom_prompt TEXT,
    response TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
