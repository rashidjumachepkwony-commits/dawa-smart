import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../app.html', import.meta.url), 'utf8');
const start = app.indexOf('function isAdmin()');
const end = app.indexOf("console.log('⚕️ Dawa Smart", start);
assert.notEqual(start, -1, 'Permission system start marker exists');
assert.notEqual(end, -1, 'Permission system end marker exists');

function permissionsFor(user) {
  const notifications = [];
  const create = new Function('currentUser', 'showToast',
    app.slice(start, end) + '; return { isEditor, checkAdminPermission };');
  return create(user, (...args) => notifications.push(args));
}

const staffRoles = ['owner', 'admin', 'developer', 'manager', 'pharmacist', 'cashier', 'lab', 'doctor'];
const businessActions = [
  'add batch', 'add drug from database', 'add product', 'add/edit product',
  'adjust credit', 'delete expense', 'delete lab test', 'delete patient',
  'delete product', 'delete sale', 'edit lab test', 'edit patient',
  'edit product', 'edit sales record', 'export data', 'manage lab tests',
  'manage patients', 'receive payment', 'restore data', 'save settings', 'save batch',
  'save expense', 'save lab test', 'save patient', 'save product', 'update product price',
  'update sale'
];
const adminOnlyActions = [
  'manage users', 'save user', 'delete user',
  'activate license', 'change license'
];
const managerOnlyActions = [
  'clear all data', 'start fresh', 'clear section data'
];

for (const role of staffRoles) {
  const permission = permissionsFor({ role, status: 'active' });
  assert.equal(permission.isEditor(), true, `${role} should be able to edit business data`);
  for (const action of businessActions) {
    assert.equal(permission.checkAdminPermission(action), true, `${role} should be allowed to ${action}`);
  }
  for (const action of managerOnlyActions) {
    const canClear = ['owner', 'admin', 'developer', 'manager'].includes(role);
    assert.equal(permission.checkAdminPermission(action), canClear, `${role} ${canClear ? 'should' : 'should not'} be allowed to ${action}`);
  }
  if (role !== 'admin' && role !== 'developer') {
    for (const action of adminOnlyActions) {
      assert.equal(permission.checkAdminPermission(action), false, `${role} must not be allowed to ${action}`);
    }
  }
}

const inactive = permissionsFor({ role: 'cashier', status: 'inactive' });
assert.equal(inactive.isEditor(), false);
assert.equal(inactive.checkAdminPermission('delete product'), false);
const inactiveManager = permissionsFor({ role: 'manager', status: 'inactive' });
for (const action of managerOnlyActions) {
  assert.equal(inactiveManager.checkAdminPermission(action), false, `Inactive managers must not be allowed to ${action}`);
}

const demo = permissionsFor({ role: 'demo', status: 'active' });
assert.equal(demo.isEditor(), true);
assert.equal(demo.checkAdminPermission('save settings'), false);
assert.equal(demo.checkAdminPermission('delete product'), true);
assert.equal(demo.checkAdminPermission('restore data'), false);
for (const action of managerOnlyActions) {
  assert.equal(demo.checkAdminPermission(action), false, `Demo users must not be allowed to ${action}`);
}

console.log('Staff permission tests passed: active managers can clear business data; other staff, inactive managers, and demo users cannot.');
