import { beforeEach, describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  clearSessionCookie,
  readSessionToken,
  safeNextPath,
  setSessionCookie,
  signSessionToken,
  verifySessionToken,
} from "@/src/lib/auth/session";
import { hashPassword, verifyPassword } from "@/src/lib/auth/password";
import { resetCookieJar } from "../stubs/cookie-jar";

const encoder = new TextEncoder();

function secret() {
  return encoder.encode(process.env.AUTH_SECRET ?? "");
}

const payload = {
  sub: "user_123",
  email: "player@levelup.id",
  name: "Player One",
  role: "CUSTOMER",
};

describe("session tokens", () => {
  it("signs and verifies a session round trip", async () => {
    const token = await signSessionToken(payload);
    const verified = await verifySessionToken(token);
    expect(verified).toEqual(payload);
  });

  it("rejects a tampered token", async () => {
    const token = await signSessionToken(payload);
    const [header, body, signature] = token.split(".");
    const tampered = `${header}.${body}.${signature.slice(0, -2)}xx`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(encoder.encode("a-different-secret-that-is-long-enough-1234567890"));
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await new SignJWT({ email: payload.email, name: payload.name, role: payload.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret());
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects payloads without an email claim", async () => {
    const token = await new SignJWT({ role: "ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(payload.sub)
      .setExpirationTime("1h")
      .sign(secret());
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects malformed input instead of throwing", async () => {
    expect(await verifySessionToken("")).toBeNull();
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });
});

describe("session cookie", () => {
  beforeEach(() => resetCookieJar());

  it("writes an HttpOnly session cookie and reads it back", async () => {
    await setSessionCookie(payload);
    const token = await readSessionToken();
    expect(token).toBeTruthy();
    expect(await verifySessionToken(token ?? "")).toEqual(payload);

    clearSessionCookie();
    expect(await readSessionToken()).toBeNull();
  });
});

describe("safeNextPath", () => {
  it("keeps relative app paths", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/admin/bookings?page=2")).toBe("/admin/bookings?page=2");
  });

  it("blocks open redirects and external URLs", () => {
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined, "/login")).toBe("/login");
  });
});

describe("password hashing", () => {
  it("hashes with bcrypt and verifies only the correct password", async () => {
    const hash = await hashPassword("Player#Levelup2026");
    expect(hash).not.toContain("Player#Levelup2026");
    expect(hash.startsWith("$2")).toBe(true);
    expect(await verifyPassword("Player#Levelup2026", hash)).toBe(true);
    expect(await verifyPassword("Wrong#Password1", hash)).toBe(false);
  });
});
