const fs = require('fs');
let content = fs.readFileSync('app.html', 'utf8');
const idx = content.indexOf('<link rel="preconnect"');
if (idx >= 0) {
  console.log('Already has preconnect');
} else {
  const headEnd = content.indexOf('</head>');
  if (headEnd >= 0) {
    content = content.slice(0, headEnd) + '\n  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin="anonymous">\n  <link rel="preconnect" href="https://unpkg.com" crossorigin="anonymous">\n' + content.slice(headEnd);
    fs.writeFileSync('app.html', content, 'utf8');
    console.log('Added preconnect hints');
  }
}