-- Initial RentLens schema — SQLite/D1 port of the Go repo's
-- 000001_init.up.sql (Postgres). Catalog, contributions, moderation, audit.
--
-- Postgres → SQLite conversions:
--   uuid PK + gen_random_uuid()  → TEXT PK, app/seed-generated 8-char base32 id
--   timestamptz + now()          → TEXT ISO-8601, DEFAULT (datetime('now'))
--   boolean                      → INTEGER (0/1)
--   gin_trgm fuzzy-search indexes→ dropped (no trigram in SQLite; Phase 3
--                                  search uses LIKE over name + aliases)
--   updated_at via shared trigger→ per-table AFTER UPDATE trigger, guarded
--                                  against re-fire by comparing updated_at
-- CHECK constraints, partial indexes, and FK actions all port directly.

-- ---------------------------------------------------------------------
-- Canonical society catalog
-- ---------------------------------------------------------------------
CREATE TABLE societies (
    id               TEXT PRIMARY KEY,
    slug             TEXT NOT NULL UNIQUE,
    name             TEXT NOT NULL,
    locality         TEXT NOT NULL DEFAULT '',
    builder          TEXT NOT NULL DEFAULT '',
    year_built_from  INTEGER,
    year_built_to    INTEGER,
    total_units      INTEGER,
    description      TEXT NOT NULL DEFAULT '',
    median_rent_2bhk INTEGER,
    range_2bhk_low   INTEGER,
    range_2bhk_high  INTEGER,
    median_rent_3bhk INTEGER,
    range_3bhk_low   INTEGER,
    range_3bhk_high  INTEGER,
    report_count     INTEGER,
    last_updated     TEXT,
    confidence_label TEXT NOT NULL DEFAULT '',
    featured_bhk     TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'published',
    source           TEXT NOT NULL DEFAULT 'seed',
    contributed_by   TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT societies_status_check CHECK (status IN ('published', 'pending', 'archived', 'rejected')),
    CONSTRAINT societies_source_check CHECK (source IN ('seed', 'contributor', 'admin'))
);
CREATE INDEX societies_locality_idx ON societies (locality) WHERE status = 'published';
CREATE INDEX societies_status_idx ON societies (status);

CREATE TRIGGER trg_societies_updated_at AFTER UPDATE ON societies
BEGIN
    UPDATE societies SET updated_at = datetime('now')
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TABLE society_aliases (
    id         TEXT PRIMARY KEY,
    society_id TEXT NOT NULL REFERENCES societies (id) ON DELETE CASCADE,
    alias      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (society_id, alias)
);
CREATE INDEX society_aliases_society_idx ON society_aliases (society_id);

-- ---------------------------------------------------------------------
-- Moderation queues: contributor-typed names not yet in the catalog
-- ---------------------------------------------------------------------
CREATE TABLE pending_areas (
    id               TEXT PRIMARY KEY,
    typed_name       TEXT NOT NULL,
    normalised_key   TEXT NOT NULL UNIQUE,
    status           TEXT NOT NULL DEFAULT 'pending',
    reject_reason    TEXT NOT NULL DEFAULT '',
    submission_count INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT pending_areas_status_check CHECK (status IN ('pending', 'promoted', 'merged', 'rejected'))
);
CREATE TRIGGER trg_pending_areas_updated_at AFTER UPDATE ON pending_areas
BEGIN
    UPDATE pending_areas SET updated_at = datetime('now')
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

CREATE TABLE pending_societies (
    id               TEXT PRIMARY KEY,
    typed_name       TEXT NOT NULL,
    normalised_key   TEXT NOT NULL UNIQUE,
    locality         TEXT NOT NULL DEFAULT '',
    pending_area_id  TEXT REFERENCES pending_areas (id) ON DELETE SET NULL,
    status           TEXT NOT NULL DEFAULT 'pending',
    reject_reason    TEXT NOT NULL DEFAULT '',
    merged_into_slug TEXT NOT NULL DEFAULT '',
    submission_count INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
    CONSTRAINT pending_societies_status_check CHECK (status IN ('pending', 'created', 'merged', 'rejected'))
);
CREATE INDEX pending_societies_status_idx ON pending_societies (status);
CREATE INDEX pending_societies_area_idx ON pending_societies (pending_area_id);
CREATE TRIGGER trg_pending_societies_updated_at AFTER UPDATE ON pending_societies
BEGIN
    UPDATE pending_societies SET updated_at = datetime('now')
    WHERE id = NEW.id AND updated_at = OLD.updated_at;
END;

-- ---------------------------------------------------------------------
-- Contributor rental-data submissions
-- ---------------------------------------------------------------------
CREATE TABLE submissions (
    id                 TEXT PRIMARY KEY,
    created_at         TEXT NOT NULL DEFAULT (datetime('now')),
    society_name       TEXT NOT NULL DEFAULT '',
    society_slug       TEXT REFERENCES societies (slug) ON UPDATE CASCADE ON DELETE SET NULL,
    pending_society_id TEXT REFERENCES pending_societies (id) ON DELETE SET NULL,
    locality           TEXT NOT NULL DEFAULT '',
    pending_area_id    TEXT REFERENCES pending_areas (id) ON DELETE SET NULL,
    bhk                TEXT NOT NULL DEFAULT '',
    monthly_rent       INTEGER NOT NULL DEFAULT 0,
    monthly_maint      INTEGER NOT NULL DEFAULT 0,
    floor_band         TEXT NOT NULL DEFAULT '',
    furnishing         TEXT NOT NULL DEFAULT '',
    sqft               INTEGER,
    deposit            INTEGER,
    block              TEXT NOT NULL DEFAULT '',
    move_in_month      TEXT NOT NULL DEFAULT '',
    move_out_month     TEXT NOT NULL DEFAULT '',
    rating_value       INTEGER,
    rating_quality     INTEGER,
    rating_owner       INTEGER,
    note               TEXT NOT NULL DEFAULT '',
    source_channel     TEXT NOT NULL DEFAULT '',
    source_detail      TEXT NOT NULL DEFAULT '',
    mover_name         TEXT NOT NULL DEFAULT '',
    mover_rating       INTEGER,
    willing_to_help    INTEGER NOT NULL DEFAULT 0,
    help_contact       TEXT NOT NULL DEFAULT '',
    status             TEXT NOT NULL DEFAULT 'pending',
    CONSTRAINT submissions_status_check CHECK (status IN ('pending', 'published', 'rejected'))
);
CREATE INDEX submissions_pending_society_idx ON submissions (pending_society_id);
CREATE INDEX submissions_pending_area_idx ON submissions (pending_area_id);
CREATE INDEX submissions_society_slug_idx ON submissions (society_slug);

-- ---------------------------------------------------------------------
-- Contact-form messages
-- ---------------------------------------------------------------------
CREATE TABLE contacts (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    name        TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT '',
    message     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'open',
    resolved_at TEXT,
    CONSTRAINT contacts_status_check CHECK (status IN ('open', 'resolved'))
);
CREATE INDEX contacts_status_idx ON contacts (status);

-- ---------------------------------------------------------------------
-- Admin audit log
-- ---------------------------------------------------------------------
CREATE TABLE admin_actions (
    id          TEXT PRIMARY KEY,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    actor       TEXT NOT NULL DEFAULT '',
    action      TEXT NOT NULL,
    target_kind TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT ''
);
CREATE INDEX admin_actions_created_idx ON admin_actions (created_at DESC);
