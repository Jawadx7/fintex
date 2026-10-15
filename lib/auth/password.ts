import bcrypt from "bcryptjs";

// Single source of truth for password hashing so sign-up, sign-in and the seed
// all use the same cost factor and library.
export const BCRYPT_ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
