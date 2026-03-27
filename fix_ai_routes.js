const fs = require('fs');
let content = fs.readFileSync('backend/routes/ai.js', 'utf8');
content = content.replace(/router\.post\("\//g, 'router.post("/ai/');
fs.writeFileSync('backend/routes/ai.js', content, 'utf8');
console.log('Fixed prefixes');