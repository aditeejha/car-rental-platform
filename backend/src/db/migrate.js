const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

(async () => {
  const dir = path.join(__dirname, '..', '..', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    console.log(`Running migration: ${f}`);
    await pool.query(sql);
  }
  await pool.end();
  console.log('Migrations complete.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
