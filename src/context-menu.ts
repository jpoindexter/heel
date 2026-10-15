type Target = { tagName?: string; isContentEditable?: boolean } | null;

/** The browser right-click menu (copy, inspect) has no place on a mascot; keep it only for text fields. */
export function shouldBlockContextMenu(target: Target): boolean {
  if (!target) return true;
  if (target.isContentEditable) return false;
  const tag = target.tagName?.toUpperCase();
  return tag !== "INPUT" && tag !== "TEXTAREA";
}
