/** Official Deluge web UI uses `show_sidebar`; older/demo configs may store `sidebar`. */
export function isWebSidebarVisible(web: Record<string, unknown> | null | undefined): boolean {
  const value = web?.show_sidebar ?? web?.sidebar;
  return value === undefined ? true : Boolean(value);
}
