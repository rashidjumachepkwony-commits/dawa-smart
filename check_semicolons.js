const fs = require('fs');
const files = fs.readdirSync('supabase/migrations');
files.forEach(f => {
  const content = fs.readFileSync('supabase/migrations/' + f, 'utf8');
  if (!content.trim().endsWith(';')) {
    console.log(f, 'does NOT end with semicolon');
  } else {
    console.log(f, 'OK');
  }
});