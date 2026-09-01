import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Acción de eliminación definitiva con confirmación.
 * Cuando `blockedReason` está presente, no se elimina: se explica por qué y se
 * sugiere archivar. La verificación de dependencias real vive en las mutaciones.
 */
export function DeleteAction({
  label = "Eliminar",
  entityLabel,
  blockedReason,
  pending,
  onConfirm,
  size = "sm",
}: {
  label?: string;
  entityLabel: string;
  blockedReason?: string | null;
  pending?: boolean;
  onConfirm: () => Promise<unknown>;
  size?: "sm" | "default";
}) {
  const blocked = !!blockedReason;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size={size}
          disabled={pending}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {blocked ? `No se puede eliminar ${entityLabel}` : `¿Eliminar ${entityLabel}?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? blockedReason
              : `Se eliminará definitivamente ${entityLabel}. Esta acción no se puede deshacer.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{blocked ? "Entendido" : "Cancelar"}</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await onConfirm();
                  toast.success("Registro eliminado");
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
