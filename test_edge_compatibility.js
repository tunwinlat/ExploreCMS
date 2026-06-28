const fs = require('fs');

const file = 'src/app/api/posts/route.ts';
let code = fs.readFileSync(file, 'utf8');

console.log("Is runtime set? ", code.includes("runtime = 'edge'"));
