import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function PostAuthRedirect() {
  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const role =
    (user.publicMetadata?.role as string | undefined) ??
    (user.privateMetadata?.role as string | undefined) ??
    "user";

  if (role === "admin") {
    redirect("/admin");
  }

  redirect("/dashboard");
}

