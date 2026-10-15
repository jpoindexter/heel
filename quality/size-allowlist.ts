/**
 * Known offenders of the size limits, as `file::name` -> the most lines they may have.
 * This list only shrinks: the test fails when an entry grows, when something new crosses a limit,
 * and when an entry no longer offends (delete it, the debt is paid).
 * It is empty: every file is <= 300 lines and every function <= 50.
 */
export const SIZE_ALLOWLIST: Readonly<Record<string, number>> = {};
