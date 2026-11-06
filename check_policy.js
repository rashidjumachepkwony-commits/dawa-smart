const fs = require('fs');
const content = fs.readFileSync('supabase/migrations/20240101000003_fix_auth_user_id_type.sql', 'utf8');
const idx = content.lastIndexOf('create policy "controlled_logs_insert_member_pharmacist"');
if (idx >= 0) {
  console.log(content.substring(idx, idx + 500));
} else {
  console.log('Not found');
}