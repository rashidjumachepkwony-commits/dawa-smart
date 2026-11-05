const fs = require('fs');
const content = fs.readFileSync('app.html', 'utf8');
let pos = content.indexOf('<script');
let count = 0;
while (pos !== -1 && count < 15) {
    const endTag = content.indexOf('>', pos);
    const tag = content.substring(pos, endTag + 1);
    console.log(count, ': pos', pos, 'tag:', tag);
    pos = content.indexOf('<script', pos + 1);
    count++;
}