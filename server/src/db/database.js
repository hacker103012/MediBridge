'use strict';
require('dotenv').config();
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

const dbPath = process.env.DB_PATH || './medibridge.db';

// Ensure directory exists
const dir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(dbPath);

// Enable WAL for performance and foreign keys
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

/**
 * node:sqlite DatabaseSync is API-compatible with better-sqlite3 for our usage:
 *   db.exec(sql)
 *   db.prepare(sql).run(...params)  → { changes, lastInsertRowid }
 *   db.prepare(sql).get(...params)  → row | undefined
 *   db.prepare(sql).all(...params)  → row[]
 */

module.exports = db;
