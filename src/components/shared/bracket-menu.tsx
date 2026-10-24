"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Edit, Eye, Loader2, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface BracketMenuProps {
  bracket: { id: string; name: string };
  canEdit: boolean;
  canDelete: boolean;
  showView?: boolean;
  onDownload?: () => void;
  onDeleted: () => void;
}

/** "⋯" actions for one of your brackets. Delete only appears when the server would allow it. */
export function BracketMenu({ bracket, canEdit, canDelete, showView = true, onDownload, onDeleted }: BracketMenuProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/brackets/${bracket.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't delete the bracket");
      toast.success("Bracket deleted");
      setConfirming(false);
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete the bracket");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`More actions for ${bracket.name}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {showView && (
            <DropdownMenuItem asChild>
              <Link href={`/brackets/${bracket.id}`}>
                <Eye className="mr-2 h-4 w-4" /> View
              </Link>
            </DropdownMenuItem>
          )}
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/brackets/new?editId=${bracket.id}`}>
                <Edit className="mr-2 h-4 w-4" /> Edit picks
              </Link>
            </DropdownMenuItem>
          )}
          {onDownload && (
            <DropdownMenuItem onSelect={onDownload}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setConfirming(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{bracket.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>All of its picks are removed. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
