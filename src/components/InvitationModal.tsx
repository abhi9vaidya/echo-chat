import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { respondToInvitation } from "@/services/api";
import { toast } from "sonner";

interface InvitationModalProps {
  open: boolean;
  invitationId: string;
  inviterName: string;
  conversationName: string;
  onClose: () => void;
  onAccepted?: (invitationId: string) => void;
  onDeclined?: (invitationId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function InvitationModal({
  open,
  invitationId,
  inviterName,
  conversationName,
  onClose,
  onAccepted,
  onDeclined,
}: InvitationModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await respondToInvitation(invitationId, true);
      toast.success(`You joined "${conversationName}"!`);
      onAccepted?.(invitationId);
      onClose();
    } catch (err) {
      toast.error("Failed to accept invitation");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    try {
      await respondToInvitation(invitationId, false);
      toast.info("Invitation declined");
      onDeclined?.(invitationId);
      onClose();
    } catch (err) {
      toast.error("Failed to decline invitation");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Group Invitation</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    {getInitials(inviterName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {inviterName}
                  </p>
                  <p className="text-xs text-muted-foreground">Invited you</p>
                </div>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">To join</p>
                <Badge className="mt-2 bg-blue-600 hover:bg-blue-700">
                  {conversationName}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">
                Accept or decline this invitation to join the group conversation.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleDecline}
            disabled={isLoading}
            className="bg-red-50 text-red-700 hover:bg-red-100"
          >
            Decline
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAccept}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Accepting..." : "Accept"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
