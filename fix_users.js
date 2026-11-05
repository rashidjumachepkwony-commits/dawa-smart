const fs = require('fs');
const content = fs.readFileSync('app.html', 'utf8');

// Find the loadUsersFromStorage function
const funcStart = content.indexOf('function loadUsersFromStorage(){');
const funcEnd = content.indexOf('function openUserModal(user, isPaid){', funcStart);

if (funcStart === -1 || funcEnd === -1) {
    console.error('Could not find function boundaries');
    process.exit(1);
}

const beforeFunc = content.substring(0, funcStart);
const funcContent = content.substring(funcStart, funcEnd);
const afterFunc = content.substring(funcEnd);

// Check if seeding code is already inside
if (funcContent.includes('IMOH ELVIS')) {
    console.log('Seeding code already inside function');
} else {
    console.log('Adding seeding code inside function');
    // Find the closing brace of the function
    const closeBraceIdx = funcContent.lastIndexOf('}');
    if (closeBraceIdx === -1) {
        console.error('Could not find closing brace');
        process.exit(1);
    }
    
    // Insert seeding code before the closing brace
    const seedingCode = `
    // Ensure IMOH ELVIS user exists (with space - matches what user types)
    if (!users.some(u => u.username === 'IMOH ELVIS')) {
        users.push({
            id: 'user_imoh_elvis',
            fullName: 'IMOH ELVIS',
            username: 'IMOH ELVIS',
            password: 'IMOH2026',
            email: '',
            phone: '',
            role: 'cashier',
            status: 'active',
            pharmacy: 'Yetu Pharmcare',
            verified: true,
            paid: false,
            createdAt: new Date().toISOString(),
            customization: {
                pharmacyName: 'Yetu Pharmcare',
                tagline: 'Your Trusted Pharmacy',
                receiptFooter: 'Thank you for choosing us!',
                primaryColor: '#0b6e4f',
                showLogoOnReceipt: true,
                showPharmacyOnReceipt: true
            }
        });
        saveUsersToStorage();
    }
`;

    const newFuncContent = funcContent.slice(0, closeBraceIdx) + seedingCode + funcContent.slice(closeBraceIdx);
    const newContent = beforeFunc + newFuncContent + afterFunc;
    
    fs.writeFileSync('app.html', newContent);
    console.log('Fixed: Added seeding code inside loadUsersFromStorage function');
}

// Also remove duplicate debugUsers function
const newContent = fs.readFileSync('app.html', 'utf8');
const firstDebug = newContent.indexOf('function debugUsers() {');
const secondDebug = newContent.indexOf('function debugUsers() {', firstDebug + 1);
if (secondDebug !== -1) {
    // Find the end of the second debugUsers function
    const nextFunc = newContent.indexOf('function ', secondDebug + 1);
    if (nextFunc !== -1) {
        const newContent2 = newContent.substring(0, secondDebug) + newContent.substring(nextFunc);
        fs.writeFileSync('app.html', newContent2);
        console.log('Removed duplicate debugUsers function');
    }
}

console.log('Done');