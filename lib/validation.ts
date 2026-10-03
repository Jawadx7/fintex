import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, { message: "First name is required" }),
    lastName: z.string().trim().min(1, { message: "Last name is required" }),
    address: z.string().trim().min(1, { message: "Address is required" }),
    country: z.string().trim().min(1, { message: "Country is required" }),
    postalCode: z
      .string()
      .trim()
      .min(1, { message: "Postal code is required" }),
    birthDate: z
      .string()
      .trim()
      .min(1, { message: "Date of birth is required" })
      .refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "Enter a valid date",
      })
      .refine((value) => new Date(value) < new Date(), {
        message: "Date of birth must be in the past",
      }),
    idNumber: z.string().trim().min(1, { message: "ID number is required" }),
    email: z.email({ message: "Enter a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" })
      .max(72, { message: "Password must be 72 characters or fewer" }),
    confirmPassword: z.string().min(1, { message: "Confirm your password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;

export type FieldErrors = Partial<Record<string, string>>;

// Build a { field: message } map from a Zod error. Written against
// `error.issues` so it works across Zod versions.
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}
