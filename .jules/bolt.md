## 2024-05-15 - React Hook Rules and Memoization
**Learning:** Calling `useMemo` conditionally or after an early return violates React Hook rules and causes rendering errors. When updating legacy code, ensure all hooks remain at the top level of the component before any `if (loading) return ...` statements.
**Action:** Always verify hook order by running `pnpm lint` when modifying component state or memoization logic, and refactor hooks to the top level when fixing bugs in older components.
