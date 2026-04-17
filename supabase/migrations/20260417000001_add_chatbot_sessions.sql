-- Tabela de sessões do chatbot WhatsApp
-- Substitui o SQLite local para permitir deploy sem volume persistente

CREATE TABLE IF NOT EXISTS public.chatbot_sessions (
    session_id          TEXT PRIMARY KEY,
    sender_id           TEXT NOT NULL,
    phone               TEXT NOT NULL,
    state               TEXT NOT NULL DEFAULT 'MENU',
    current_menu        TEXT NOT NULL DEFAULT 'main',
    user_name           TEXT,
    is_student          BOOLEAN NOT NULL DEFAULT FALSE,
    user_loaded         BOOLEAN NOT NULL DEFAULT FALSE,
    display_name        TEXT,
    flow_data           TEXT NOT NULL DEFAULT '{}',
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    started_at          TEXT NOT NULL,
    last_interaction_at TEXT NOT NULL,
    ended_at            TEXT,
    end_reason          TEXT
);

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_sender_active
    ON public.chatbot_sessions (sender_id, is_active, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_chatbot_sessions_active_last
    ON public.chatbot_sessions (is_active, last_interaction_at DESC);

ALTER TABLE public.chatbot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chatbot_sessions_anon_all"
    ON public.chatbot_sessions
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
