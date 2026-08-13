/** Package names: simple npm-style names (no scopes in this slice). */
export function isValidPackageName(name: string): boolean {
  if (name.length === 0 || name.length > 64) return false;
  if (name.startsWith('.') || name.startsWith('_')) return false;
  if (name.includes('/') || name.includes('\\')) return false;
  return /^[a-z0-9][a-z0-9._-]*$/.test(name);
}
