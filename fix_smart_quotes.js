const fs = require('fs');
let content = fs.readFileSync('supabase/migrations/20240101000003_fix_auth_user_id_type.sql', 'utf8');
content = content.replace(/\u2018/g, "'").replace(/\u2019/g, "'").replace(/\u201C/g, '"').replace(/\u201D/g, '"').replace(/\u2014/g, '--').replace(/\u2013/g, '-').replace(/\u2026/g, '...').replace(/\u2022/g, '*');
fs.writeFileSync('supabase/migrations/20240101000003_fix_auth_user_id_type.sql', content, 'utf8');
console.log('Fixed smart quotes');