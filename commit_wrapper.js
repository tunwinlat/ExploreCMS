const { execSync } = require('child_process');

try {
  const diff = execSync('git diff e1401a3~1 e1401a3', { encoding: 'utf8' });
  console.log(diff);
} catch (e) {
  console.log("No diff found or error");
}
