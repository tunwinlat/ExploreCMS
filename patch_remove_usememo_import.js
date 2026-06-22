const fs = require('fs');
const path = 'src/components/SearchBox.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `import { useState, useEffect, useRef, useCallback, useMemo } from 'react'`,
  `import { useState, useEffect, useRef, useCallback } from 'react'`
);

fs.writeFileSync(path, content);
console.log('Cleaned import');
