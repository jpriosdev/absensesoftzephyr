import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const JSON_PATH = path.join(DATA_DIR, 'qa-data.json');
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data');
const PUBLIC_JSON_PATH = path.join(PUBLIC_DATA_DIR, 'qa-data.json');
const DB_PATH = path.join(PUBLIC_DATA_DIR, 'qa-dashboard.db');

// Load project configuration files (safe, with fallbacks)
const CONFIG_DIR = path.join(ROOT, 'config');
const QA_CONFIG_PATH = path.join(CONFIG_DIR, 'qa-config.json');
const APP_SETTINGS_PATH = path.join(CONFIG_DIR, 'app-settings.json');

function safeReadJson(filePath) {
	try {
		if (!fs.existsSync(filePath)) return null;
		const raw = fs.readFileSync(filePath, 'utf8');
		return JSON.parse(raw);
	} catch (err) {
		// don't throw — caller should handle null
		return null;
	}
}

const QA_CONFIG = safeReadJson(QA_CONFIG_PATH) || {};
const APP_SETTINGS = safeReadJson(APP_SETTINGS_PATH) || {};

// Merge QA_CONFIG with APP_SETTINGS (app settings override qa-config when keys collide)
const APP_CONFIG = Object.assign({}, QA_CONFIG, APP_SETTINGS);

export { ROOT, DATA_DIR, JSON_PATH, PUBLIC_DATA_DIR, PUBLIC_JSON_PATH, DB_PATH, QA_CONFIG, APP_SETTINGS, APP_CONFIG };
