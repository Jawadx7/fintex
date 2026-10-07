import { z } from "zod";

export const loginSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be 72 characters or fewer" });

// Signup step 1 creates the account. Every field here maps to a non-null
// column on the User model, so no other data is needed to sign up.
export const signupStep1Schema = z
  .object({
    firstName: z.string().trim().min(1, { message: "First name is required" }),
    lastName: z.string().trim().min(1, { message: "Last name is required" }),
    email: z.email({ message: "Enter a valid email address" }),
    password: passwordSchema,
    confirmPassword: z.string().min(1, { message: "Confirm your password" }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Signup step 2 fills the remaining profile columns, which are all nullable on
// the User model, so an account created in step 1 is valid even if the user
// never finishes this step.
export const profileSchema = z.object({
  address: z.string().trim().min(1, { message: "Address is required" }),
  country: z.string().trim().min(1, { message: "Country is required" }),
  postalCode: z.string().trim().min(1, { message: "Postal code is required" }),
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
});

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupStep1Schema>;
export type ProfileValues = z.infer<typeof profileSchema>;

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
