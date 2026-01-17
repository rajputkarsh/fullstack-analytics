"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type AuthRedirectProps = {
  destination: string;
};

export default function AuthRedirect({ destination }: AuthRedirectProps) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    router.replace(destination);
  }, [destination, isLoaded, isSignedIn, router]);

  return null;
}

