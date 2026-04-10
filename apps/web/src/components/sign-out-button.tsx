"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={async () => {
        await signOut();
        router.push("/login");
      }}
      title="Sign out"
    >
      <LogOut className="size-4" />
    </Button>
  );
}