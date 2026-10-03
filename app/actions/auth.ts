"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { BCRYPT_ROUNDS, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  loginSchema,
  signupSchema,
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

export async function registerUser(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    address: text(formData, "address"),
    country: text(formData, "country"),
    postalCode: text(formData, "postalCode"),
    birthDate: text(formData, "birthDate"),
    idNumber: text(formData, "idNumber"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });

  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error) };
  }

  const { confirmPassword, birthDate, email, password, ...profile } =
    parsed.data;

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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await prisma.user.create({
    data: {
      ...profile,
      email: normalizedEmail,
      passwordHash,
      birthDate: new Date(birthDate),
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
