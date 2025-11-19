-- Drop tables in reverse dependency order (for easy re-run during dev)
DROP TABLE IF EXISTS users_badges        CASCADE;
DROP TABLE IF EXISTS daily_metric_summary CASCADE;
DROP TABLE IF EXISTS Productivity_Log    CASCADE;
DROP TABLE IF EXISTS Security            CASCADE;
DROP TABLE IF EXISTS Activity_Type       CASCADE;
DROP TABLE IF EXISTS Goal                CASCADE;
DROP TABLE IF EXISTS badge_types         CASCADE;
DROP TABLE IF EXISTS Users               CASCADE;

------------------------------------------------------------
-- USERS
------------------------------------------------------------
CREATE TABLE Users (
    user_id       BIGSERIAL PRIMARY KEY,
    user_email    TEXT        NOT NULL UNIQUE,
    display_name  TEXT,
    time_zone     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    username      TEXT        UNIQUE
);

------------------------------------------------------------
-- GOAL (each goal belongs to a user)
------------------------------------------------------------
CREATE TABLE Goal (
    goal_id          BIGSERIAL PRIMARY KEY,
    user_id          BIGINT     NOT NULL,
    goal_description TEXT,
    goal_start_date  DATE,
    goal_deadline    DATE,
    completed_at     TIMESTAMPTZ -- If null, then goal is not completed
);

------------------------------------------------------------
-- BADGE TYPES (master list of possible badges)
------------------------------------------------------------
CREATE TABLE badge_types (
    badge_type_id    BIGSERIAL PRIMARY KEY,
    badge_name       TEXT        NOT NULL,
    badge_description TEXT,
    is_badge_active  BOOLEAN     NOT NULL DEFAULT TRUE
);

------------------------------------------------------------
-- USERS_BADGES (which user has which badge)
-- Composite PK: (badge_type_id, user_id)
------------------------------------------------------------
CREATE TABLE users_badges (
    badge_type_id BIGINT     NOT NULL,
    user_id       BIGINT     NOT NULL,
    awarded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (badge_type_id, user_id)
);

------------------------------------------------------------
-- SECURITY (1–to–1 with Users)
------------------------------------------------------------
CREATE TABLE Security (
    user_id       BIGINT      PRIMARY KEY,
    password_hash TEXT        NOT NULL
);

------------------------------------------------------------
-- ACTIVITY TYPE (per-user list of activities)
------------------------------------------------------------
CREATE TABLE Activity_Type (
    activity_type_id BIGSERIAL PRIMARY KEY,
    activity_name    TEXT        NOT NULL,
    category         TEXT,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE
);

------------------------------------------------------------
-- PRODUCTIVITY LOG (each log entry belongs to a user & activity type)
------------------------------------------------------------
CREATE TABLE Productivity_Log (
    log_id           BIGSERIAL PRIMARY KEY,
    user_id          BIGINT      NOT NULL,
    activity_type_id BIGINT      NOT NULL,
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ,
    duration_minutes INTEGER,
    focus_score      INTEGER,
    energy_level     INTEGER
);

------------------------------------------------------------
-- DAILY METRIC SUMMARY (per user, per day)
-- Composite PK: (user_id, summary_date)
------------------------------------------------------------
-- CREATE TABLE daily_metric_summary (
--     user_id            BIGINT      NOT NULL,
--     summary_date       DATE        NOT NULL,
--     total_minutes      INTEGER,
--     avg_focus          NUMERIC(5,2),
--     avg_energy         NUMERIC(5,2),
--     top_activity_type_id BIGINT,
--     PRIMARY KEY (user_id, summary_date)
-- );

------------------------------------------------------------
-- FOREIGN KEYS
------------------------------------------------------------

-- Goal → Users
ALTER TABLE Goal
    ADD CONSTRAINT fk_goal_user
    FOREIGN KEY (user_id)
    REFERENCES Users (user_id)
    ON DELETE CASCADE;

-- Users_Badges → Users & Badge_Types
ALTER TABLE users_badges
    ADD CONSTRAINT fk_users_badges_user
    FOREIGN KEY (user_id)
    REFERENCES Users (user_id)
    ON DELETE CASCADE;

ALTER TABLE users_badges
    ADD CONSTRAINT fk_users_badges_badge_type
    FOREIGN KEY (badge_type_id)
    REFERENCES badge_types (badge_type_id)
    ON DELETE CASCADE;

-- Security → Users (1–to–1)
ALTER TABLE Security
    ADD CONSTRAINT fk_security_user
    FOREIGN KEY (user_id)
    REFERENCES Users (user_id)
    ON DELETE CASCADE;

-- Productivity_Log → Users & Activity_Type
ALTER TABLE Productivity_Log
    ADD CONSTRAINT fk_prod_log_user
    FOREIGN KEY (user_id)
    REFERENCES Users (user_id)
    ON DELETE CASCADE;

ALTER TABLE Productivity_Log
    ADD CONSTRAINT fk_prod_log_activity_type
    FOREIGN KEY (activity_type_id)
    REFERENCES Activity_Type (activity_type_id)
    ON DELETE RESTRICT;

-- daily_metric_summary → Users & Activity_Type
-- ALTER TABLE daily_metric_summary
--     ADD CONSTRAINT fk_daily_summary_user
--     FOREIGN KEY (user_id)
--     REFERENCES Users (user_id)
--     ON DELETE CASCADE;

-- ALTER TABLE daily_metric_summary
--     ADD CONSTRAINT fk_daily_summary_top_activity
--     FOREIGN KEY (top_activity_type_id)
--     REFERENCES Activity_Type (activity_type_id)
--     ON DELETE SET NULL;

------------------------------------------------------------
-- SEED DATA
------------------------------------------------------------

-- 1) Create app user "conlad"
INSERT INTO Users (user_email, display_name, time_zone, username)
VALUES ('conradcb@byu.edu', 'conlad', 'America/Denver', 'conlad');

-- 2) SECURITY row for that user (password "admin" in clear text for now)
INSERT INTO Security (user_id, password_hash)
VALUES (currval('users_user_id_seq'), 'admin');

-- 3) A couple of badge types
INSERT INTO badge_types (badge_name, badge_description)
VALUES
    ('Streak Starter', 'Completed your first focus session'),
    ('Weekend Warrior', 'Logged activity on a Saturday or Sunday');

-- Give "Streak Starter" badge to conlad
INSERT INTO users_badges (badge_type_id, user_id)
VALUES (
    (SELECT badge_type_id FROM badge_types WHERE badge_name = 'Streak Starter'),
    currval('users_user_id_seq')
);

-- 4) A goal for conlad
INSERT INTO Goal (user_id, goal_description, goal_start_date, goal_deadline)
VALUES (
    currval('users_user_id_seq'),
    'Study / code for 2 hours each weekday',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days'
);

-- 5) Global activity types (no user_id)
INSERT INTO Activity_Type (activity_name, category)
VALUES
    ('Deep Work - Coding', 'Work'),
    ('Reading / Study',    'Learning'),
    ('Exercise',           'Health');

-- 6) A few Productivity_Log entries wired up to that user

-- Example: 60-minute coding session
INSERT INTO Productivity_Log
    (user_id, activity_type_id, start_time, end_time, duration_minutes, focus_score, energy_level)
VALUES
    (
        currval('users_user_id_seq'),
        (SELECT activity_type_id
           FROM Activity_Type
          WHERE activity_name = 'Deep Work - Coding'
          LIMIT 1),
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour',
        60,
        8,
        7
    );

-- Example: 30-minute reading session
INSERT INTO Productivity_Log
    (user_id, activity_type_id, start_time, end_time, duration_minutes, focus_score, energy_level)
VALUES
    (
        currval('users_user_id_seq'),
        (SELECT activity_type_id
           FROM Activity_Type
          WHERE activity_name = 'Reading / Study'
          LIMIT 1),
        NOW() - INTERVAL '23 hours',
        NOW() - INTERVAL '22 hours 30 minutes',
        30,
        7,
        6
    );
