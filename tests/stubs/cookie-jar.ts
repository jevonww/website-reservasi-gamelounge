/** Minimal in-memory cookie jar used by the `next/headers` test stub. */
const jar = new Map<string, string>();

export function resetCookieJar() {
  jar.clear();
}

export function getCookieValue(name: string) {
  return jar.get(name) ?? null;
}

export const cookieJar = {
  get(name: string) {
    const value = jar.get(name);
    return value ? { name, value } : undefined;
  },
  set(name: string, value: string) {
    jar.set(name, value);
  },
  delete(name: string) {
    jar.delete(name);
  },
};
