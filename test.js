const { createClient } = require('@libsql/client');
try {
  createClient({ url: 'javascript:alert(1)' });
} catch(e) {
  console.log("Error 1:", e.message);
}

try {
  createClient({ url: 'http://localhost' });
  console.log("Success 2");
} catch(e) {
  console.log("Error 2:", e.message);
}
