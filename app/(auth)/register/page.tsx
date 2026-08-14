import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Register — LevelUp" };

export default function RegisterPage() {
  return <RegisterForm />;
}
