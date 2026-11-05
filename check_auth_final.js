const fs = require('fs');
const files = fs.readdirSync('supabase/migrations');
files.forEach(f => {
  const content = fs.readFileSync('supabase/migrations/' + f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('auth.uid()') && !l.includes('auth.uid()::text') && !l.trim().startsWith('--') && !f.includes('init_schema')) {
      console.log(f, i+1, ':', l.trim());
    }
  });
});