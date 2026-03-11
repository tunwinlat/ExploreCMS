const fs = require('fs');
const path = require('path');

const notice = `/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
`;

function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
      } else { 
        results.push(file);
      }
    });
  } catch (err) {
    console.error('Error walking directory', dir, err);
  }
  return results;
}

const directoriesToWalk = ['./src', './prisma'];
const files = [];
directoriesToWalk.forEach(dir => {
  if (fs.existsSync(dir)) {
    files.push(...walk(dir));
  }
});

let updatedCount = 0;

files.forEach(file => {
  if (file.match(/\.(ts|tsx|js|jsx|css|prisma)$/)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('Mozilla Public') && !content.includes('MPL')) {
      if (file.endsWith('.prisma')) {
        const prismaNotice = `// This Source Code Form is subject to the terms of the Mozilla Public\n// License, v. 2.0. If a copy of the MPL was not distributed with this\n// file, You can obtain one at https://mozilla.org/MPL/2.0/.\n`;
        fs.writeFileSync(file, prismaNotice + '\n' + content);
      } else {
        fs.writeFileSync(file, notice + '\n' + content);
      }
      updatedCount++;
    }
  }
});

console.log(`Successfully added MPL 2.0 header to ${updatedCount} files.`);
