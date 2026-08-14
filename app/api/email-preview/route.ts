import { cheerEmail } from "@/lib/email";

export async function GET() {
  const email = cheerEmail("Sung Jinwoo");

  return new Response(email.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
