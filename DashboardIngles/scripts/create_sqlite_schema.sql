-- Tabla de Sprints
CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    start_date TEXT,
    end_date TEXT,
    version TEXT,
    environment TEXT,
    tags TEXT
);

-- Tabla de Bugs
CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id INTEGER,
    priority TEXT,
    status TEXT,
    module TEXT,
    assigned_to TEXT,
    created_at TEXT,
    resolved_at TEXT,
    FOREIGN KEY(sprint_id) REFERENCES sprints(id)
);

-- Tabla de Casos de Prueba
CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id INTEGER,
    executed INTEGER,
    passed INTEGER,
    failed INTEGER,
    automated INTEGER,
    FOREIGN KEY(sprint_id) REFERENCES sprints(id)
);

-- Tabla de Módulos
CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    bugs_count INTEGER,
    percentage INTEGER
);

-- Tabla de Desarrolladores
CREATE TABLE IF NOT EXISTS developers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    assigned INTEGER,
    resolved INTEGER,
    pending INTEGER,
    workload TEXT
);
