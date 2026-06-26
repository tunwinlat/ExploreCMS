## 2024-06-26 - Optimize Distance Calculations in Animation Loops
**Learning:** Indiscriminate use of `Math.sqrt` in multiple O(n²) nested loops inside requestAnimationFrame creates significant CPU bottlenecks. Calculating true Euclidean distance is unnecessary if we only care if objects are within a certain radius.
**Action:** Always use squared distance `(dx*dx + dy*dy < maxDist*maxDist)` instead of `Math.sqrt`. Additionally, add a fast-fail Manhattan distance check `(Math.abs(dx) > maxDist || Math.abs(dy) > maxDist)` to skip expensive multiplications for objects that are far apart.
