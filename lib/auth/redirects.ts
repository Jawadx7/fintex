// Single source of truth for where a signed-in user is sent after auth.
// Brief 3.2 will branch on `role` to route staff to the compliance dashboard.
export function getPostLoginPath(role?: string): string {
  void role;
  return "/account";
}
