const fs = require('fs');
let content = fs.readFileSync('supabase2.js', 'utf8');
content = content.replace(
  "script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase-min.js';\n        script.crossOrigin = 'anonymous';",
  "script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase-min.js';\n        script.crossOrigin = 'anonymous';\n        // Fallback to unpkg if jsdelivr fails\n        script.onerror = function () {\n          console.warn('[Dawa Smart Supabase] jsdelivr failed, trying unpkg...');\n          script.src = 'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase-min.js';\n          script.crossOrigin = 'anonymous';\n          script.onerror = function () {\n            reject(new Error('Failed to load Supabase SDK from both jsdelivr and unpkg'));\n          };\n        };"
);
fs.writeFileSync('supabase2.js', content, 'utf8');
console.log('Added fallback CDN');