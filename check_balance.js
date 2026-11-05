const fs = require('fs');
const content = fs.readFileSync('extracted.js', 'utf8');
let brace = 0, paren = 0, bracket = 0;
let inTemplate = false, inSingle = false, inDouble = false;

for (let i = 0; i < content.length; i++) {
    let ch = content[i];
    if (inTemplate) {
        if (ch === '`') inTemplate = false;
        continue;
    }
    if (inSingle) {
        if (ch === "'" && content[i-1] !== '\\') inSingle = false;
        continue;
    }
    if (inDouble) {
        if (ch === '"' && content[i-1] !== '\\') inDouble = false;
        continue;
    }
    if (ch === '`') { inTemplate = true; continue; }
    if (ch === "'") { inSingle = true; continue; }
    if (ch === '"') { inDouble = true; continue; }
    if (ch === '{') brace++;
    if (ch === '}') brace--;
    if (ch === '(') paren++;
    if (ch === ')') paren--;
    if (ch === '[') bracket++;
    if (ch === ']') bracket--;
}
console.log('brace:', brace, 'paren:', paren, 'bracket:', bracket);