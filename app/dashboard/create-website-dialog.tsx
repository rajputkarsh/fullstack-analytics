"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { ActionResult } from "./websites/actions";

type CreateWebsiteDialogProps = {
  createWebsite: (formData: FormData) => Promise<ActionResult>;
};

export default function CreateWebsiteDialog({
  createWebsite,
}: CreateWebsiteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleCreate = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createWebsite(formData);
      if (!result.success) {
        setError(result.error || "Unable to create website.");
        return;
      }
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create new website</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add website</DialogTitle>
          <DialogDescription>
            Provide a name and domain to generate a tracking script.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <form ref={formRef} action={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Website name
            </label>
            <Input name="name" placeholder="Marketing site" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Domain</label>
            <Input name="domain" placeholder="example.com" required />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Spinner /> : "Create website"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

