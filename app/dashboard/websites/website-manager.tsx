"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { UserButton } from "@clerk/nextjs";
import type { ActionResult } from "./actions";

type Website = {
  id: string;
  name: string;
  domain: string;
  trackingId: string;
  createdAt: string;
  updatedAt: string;
};

type WebsiteManagerProps = {
  websites: Website[];
  baseUrl: string;
  actions: {
    createWebsite: (formData: FormData) => Promise<ActionResult>;
    updateWebsite: (formData: FormData) => Promise<ActionResult>;
    deleteWebsite: (formData: FormData) => Promise<ActionResult>;
  };
};

export default function WebsiteManager({
  websites,
  baseUrl,
  actions,
}: WebsiteManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({
    id: "",
    name: "",
    domain: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Website | null>(null);
  const createFormRef = useRef<HTMLFormElement>(null);
  const editFormRef = useRef<HTMLFormElement>(null);

  const websiteScripts = useMemo(() => {
    return new Map(
      websites.map((website) => [
        website.id,
        `<script
  src="${baseUrl}/tracker.js"
  data-tracking-id="${website.trackingId}"
  data-endpoint="${baseUrl}/api/track"
  async
></script>`,
      ]),
    );
  }, [baseUrl, websites]);

  const handleCreate = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await actions.createWebsite(formData);
      if (!result.success) {
        setError(result.error || "Unable to create website.");
        return;
      }
      createFormRef.current?.reset();
      setCreateOpen(false);
      router.refresh();
    });
  };

  const handleUpdate = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await actions.updateWebsite(formData);
      if (!result.success) {
        setError(result.error || "Unable to update website.");
        return;
      }
      editFormRef.current?.reset();
      setEditOpen(false);
      router.refresh();
    });
  };

  const handleDelete = async (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await actions.deleteWebsite(formData);
      if (!result.success) {
        setError(result.error || "Unable to delete website.");
        return;
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const handleCopy = async (websiteId: string) => {
    const script = websiteScripts.get(websiteId);
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
      setCopiedId(websiteId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Unable to copy the tracking script.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <header className="bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Websites
              </h1>
              <p className="text-sm text-gray-600 dark:text-neutral-400">
                Manage websites and tracking scripts.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                ← Back to dashboard
              </Link>              
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>Add website</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add website</DialogTitle>
                    <DialogDescription>
                      Provide a name and domain to generate a tracking script.
                    </DialogDescription>
                  </DialogHeader>
                  <form ref={createFormRef} action={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Website name
                      </label>
                      <Input name="name" placeholder="Marketing site" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">
                        Domain
                      </label>
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
              <UserButton />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {websites.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No websites yet</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add a website to start tracking analytics.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {websites.map((website) => {
              const script = websiteScripts.get(website.id) || "";
              return (
                <Card key={website.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle>{website.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{website.domain}</p>
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(website.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" asChild>
                          <Link href={`/dashboard/analytics/${website.id}`}>
                            View analytics
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditValues({
                              id: website.id,
                              name: website.name,
                              domain: website.domain,
                            });
                            setEditOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => {
                            setDeleteTarget(website);
                            setDeleteOpen(true);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Tracking script</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(website.id)}
                      >
                        {copiedId === website.id ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <Textarea value={script} readOnly className="min-h-[140px]" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit website</DialogTitle>
            <DialogDescription>
              Update the website name or domain.
            </DialogDescription>
          </DialogHeader>
          <form ref={editFormRef} action={handleUpdate} className="space-y-4">
            <input type="hidden" name="id" value={editValues.id} />
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Website name
              </label>
              <Input
                name="name"
                value={editValues.name}
                onChange={(event) =>
                  setEditValues((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Domain
              </label>
              <Input
                name="domain"
                value={editValues.domain}
                onChange={(event) =>
                  setEditValues((prev) => ({ ...prev, domain: event.target.value }))
                }
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete website</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.name}
              </span>{" "}
              and all related analytics data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={handleDelete}>
            <input type="hidden" name="id" value={deleteTarget?.id || ""} />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

