// Copies .env.example -> server/.env on first install if missing.
const fs = require('fs');
const path = require('path');

const example = path.join(__dirname, '..', '.env.example');
const target = path.join(__dirname, '..', 'server', '.env');

try {
  if (!fs.existsSync(target) && fs.existsSync(example)) {
    let content = fs.readFileSync(example, 'utf8');
    // strip comments for the working .env to keep it lean
    content = content
      .split('\n')
      .filter((l) => !l.trimStart().startsWith('#') && l.trim().length)
      .join('\n');
    fs.writeFileSync(target, content + '\n');
    console.log('✓ Created server/.env from .env.example (demo mode)');
  }
} catch (e) {
  console.warn('Could not create server/.env:', e.message);
}
