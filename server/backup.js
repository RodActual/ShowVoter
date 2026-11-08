// Usage: npm run backup [-- /path/to/backup.sqlite]
// Makes a consistent copy of the live database (safe while the server is running).
require('dotenv').config();
const path = require('path');
const db = require('./db');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = process.argv[2] || path.join(__dirname, 'backups', `data-${stamp}.sqlite`);
require('fs').mkdirSync(path.dirname(target), { recursive: true });

db.backup(target)
  .then(() => { console.log(`Backup written to ${target}`); process.exit(0); })
  .catch((err) => { console.error('Backup failed:', err); process.exit(1); });
