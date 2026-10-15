"use server";

import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/prisma";
import {
  loginSchema,
  profileSchema,
  signupStep1Schema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation";

export type AuthActionState = {
  fieldErrors?: FieldErrors;
  formError?: string;
  success?: boolean;
};

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

// Signup step 1: creates the account and signs the user in. The profile
// columns left untouched here are all nullable on the User model.
export async function registerUser(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupStep1Schema.safeParse({
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { confirmPassword, email, password, firstName, lastName } = parsed.data;

  if (confirmPassword !== password) {
    return { fieldErrors: { confirmPassword: "Passwords do not match" } };
  }

  const normalizedEmail = email.toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  if (existingUser) {
    return {
      fieldErrors: { email: "An account with this email already exists" },
    };
  }

  const passwordHash = await hashPassword(password);

  // Explicit field list on purpose: never spread the request body, and never
  // accept a client-supplied `role`. Role falls back to the schema default
  // (USER) so a payload containing role:"ADMIN" cannot escalate privileges.
  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email: normalizedEmail,
      passwordHash,
    },
  });

  try {
    await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { formError: "Account created, but sign-in failed. Please log in." };
    }
    throw error;
  }

  return { success: true };
}

// Signup step 2: attaches the remaining profile details to the account that
// step 1 already created, so it runs against the session rather than
// re-creating the user. Server Actions are not covered by proxy.ts, so the
// guard runs here too.
export async function updateProfile(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    address: text(formData, "address"),
    country: text(formData, "country"),
    postalCode: text(formData, "postalCode"),
    birthDate: text(formData, "birthDate"),
    idNumber: text(formData, "idNumber"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { birthDate, ...profile } = parsed.data;

  await prisma.user.update({
    where: { id: user.id },
    data: { ...profile, birthDate: new Date(birthDate) },
  });

  return { success: true };
}

export async function authenticateUser(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: text(formData, "email"),
    password: text(formData, "password"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { email, password } = parsed.data;

  try {
    await signIn("credentials", {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { formError: "Invalid email or password" };
    }
    throw error;
  }

  return { success: true };
}

export async function logOutUser(): Promise<void> {
  await signOut({ redirectTo: "/" });
}
