const fs = require('fs');
const files = fs.readdirSync('supabase/migrations');
files.forEach(f => {
  const content = fs.readFileSync('supabase/migrations/' + f, 'utf8');
  if (content.includes('sales') && content.includes('alter column')) {
    console.log('===', f, '===');
    const lines = content.split('\n');
    lines.forEach((l, i) => {
      if (l.toLowerCase().includes('sales') && (l.includes('alter column') || l.includes('alter table'))) console.log(i+1, ':', l.trim());
    });
  }
});