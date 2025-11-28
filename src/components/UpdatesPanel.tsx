import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { respondToInvitation } from "@/services/api";

interface Invitation {
  id: string;
  _id?: string;
  conversationName: string;
  inviterName: string;
  status?: "pending" | "accepted" | "declined";
}

interface UpdatesPanelProps {
  pendingInvitations: Invitation[];
  onInvitationResponse?: (invitationId: string, accepted: boolean) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export default function UpdatesPanel({ pendingInvitations, onInvitationResponse }: UpdatesPanelProps) {
  const [processingInvites, setProcessingInvites] = useState<Set<string>>(new Set());

  const handleAcceptInvite = async (invitationId: string) => {
    setProcessingInvites((prev) => new Set(prev).add(invitationId));
    try {
      await respondToInvitation(invitationId, true);
      toast.success("Invitation accepted!");
      onInvitationResponse?.(invitationId, true);
    } catch (err) {
      toast.error("Failed to accept invitation");
      console.error(err);
    } finally {
      setProcessingInvites((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    setProcessingInvites((prev) => new Set(prev).add(invitationId));
    try {
      await respondToInvitation(invitationId, false);
      toast.info("Invitation declined");
      onInvitationResponse?.(invitationId, false);
    } catch (err) {
      toast.error("Failed to decline invitation");
      console.error(err);
    } finally {
      setProcessingInvites((prev) => {
        const next = new Set(prev);
        next.delete(invitationId);
        return next;
      });
    }
  };

  if (pendingInvitations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No new updates</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {pendingInvitations.map((invite) => {
        const inviteId = invite.id || invite._id || "";
        const isProcessing = processingInvites.has(inviteId);

        return (
          <Card key={inviteId} className="border-accent bg-accent/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(invite.inviterName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {invite.inviterName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    invited you to join
                  </p>
                  <Badge className="mt-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                    {invite.conversationName}
                  </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                  onClick={() => handleAcceptInvite(inviteId)}
                  disabled={isProcessing}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isProcessing ? "Accepting..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-destructive border-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => handleDeclineInvite(inviteId)}
                  disabled={isProcessing}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {isProcessing ? "Declining..." : "Decline"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
