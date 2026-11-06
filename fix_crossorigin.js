const fs = require('fs');
let content = fs.readFileSync('supabase2.js', 'utf8');
content = content.replace(
  "script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase-min.js';",
  "script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase-min.js';\n        script.crossOrigin = 'anonymous';"
);
fs.writeFileSync('supabase2.js', content, 'utf8');
console.log('Added crossOrigin attribute');