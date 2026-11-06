const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20240101000003_fix_auth_user_id_type.sql', 'utf8');
// Replace all non-ASCII characters with ASCII equivalents
content = content.replace(/[\u2018\u2019]/g, "'");   // smart single quotes
content = content.replace(/[\u201C\u201D]/g, '"');   // smart double quotes
content = content.replace(/[\u2014\u2013]/g, '-');   // em/en dash
content = content.replace(/\u2026/g, '...');         // ellipsis
content = content.replace(/\u2022/g, '*');           // bullet
content = content.replace(/\u2018/g, "'");           // left single quote
content = content.replace(/\u2019/g, "'");           // right single quote
content = content.replace(/\u201C/g, '"');           // left double quote
content = content.replace(/\u201D/g, '"');           // right double quote
content = content.replace(/\u2014/g, '--');          // em dash
content = content.replace(/\u2013/g, '-');           // en dash
content = content.replace(/\u2026/g, '...');         // ellipsis
content = content.replace(/\u2022/g, '*');           // bullet
fs.writeFileSync('supabase/migrations/20240101000003_fix_auth_user_id_type.sql', content, 'utf8');
console.log('Fixed all non-ASCII characters');