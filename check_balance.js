const fs = require('fs');
const content = fs.readFileSync('supabase/migrations/20240101000003_fix_auth_user_id_type.sql', 'utf8');
const statements = content.split(';');
statements.forEach((s, i) => {
  const trimmed = s.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    const paren = (trimmed.match(/\(/g)||[]).length - (trimmed.match(/\)/g)||[]).length;
    const brace = (trimmed.match(/\{/g)||[]).length - (trimmed.match(/\}/g)||[]).length;
    if (paren !== 0 || brace !== 0) {
      console.log('Stmt', i, 'unbalanced: paren=', paren, 'brace=', brace, ':', trimmed.substring(0, 100));
    }
  }
});
console.log('Total statements:', statements.length);