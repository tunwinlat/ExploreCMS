## 2026-06-02 - [Fix React Hook Rules for Performance]
**Learning:** The application had critical 'react-hooks/rules-of-hooks' bugs where `useMemo` and `useEffect` were being called conditionally or after early `if (loading) return` statements, causing React rendering failures.
**Action:** When adding or modifying hooks for performance (like memoization or lazy loading effects), always ensure they are declared at the very top level of the component before any early returns or conditional logic to maintain the correct hook call order across renders.
