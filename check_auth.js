const fs = require('fs');
const files = fs.readdirSync('supabase/migrations');
files.forEach(f => {
  const content = fs.readFileSync('supabase/migrations/' + f, 'utf8');
  if (content.includes('auth.uid()') && !content.includes('auth.uid()::text')) {
    console.log('===', f, '===');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.includes('auth.uid()') && !l.includes('auth.uid()::text')) console.log(i+1, ':', l.trim());
    });
  }
});