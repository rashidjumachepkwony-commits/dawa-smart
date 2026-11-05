const fs = require('fs');
const content = fs.readFileSync('app.html', 'utf8');
const start = content.indexOf('<script>');
const end = content.lastIndexOf('</script>');
const js = content.substring(start + 8, end);
const lines = js.split('\n');
let brace = 0, paren = 0, bracket = 0;
let inTemplate = false, inSingle = false, inDouble = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    for (let j = 0; j < line.length; j++) {
        let ch = line[j];
        if (inTemplate) {
            if (ch === '`') inTemplate = false;
            continue;
        }
        if (inSingle) {
            if (ch === "'" && line[j-1] !== '\\') inSingle = false;
            continue;
        }
        if (inDouble) {
            if (ch === '"' && line[j-1] !== '\\') inDouble = false;
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
    if (brace < 0 || paren < 0 || bracket < 0) {
        console.log('NEGATIVE at JS line', i+1, 'brace:', brace, 'paren:', paren, 'bracket:', bracket);
        console.log(line.substring(0, 150));
    }
}
console.log('Final - brace:', brace, 'paren:', paren, 'bracket:', bracket);