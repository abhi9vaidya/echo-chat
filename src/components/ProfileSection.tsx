import { useState } from "react";
import { User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, User as UserIcon, Mail } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ProfileSectionProps {
  user: User;
  onLogout: () => void;
  pendingInvitationCount?: number;
}

export const ProfileSection = ({ user, onLogout, pendingInvitationCount = 0 }: ProfileSectionProps) => {
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatEmail = (email: string) => {
    return email.length > 30 ? email.substring(0, 27) + "..." : email;
  };

  return (
    <div className="border-b border-border p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start hover:bg-sidebar-hover h-auto p-2 gap-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src="" />
              <AvatarFallback className="bg-blue-500 text-white font-semibold">
                {getInitials(user.name || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {formatEmail(user.email)}
              </p>
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Account</span>
            {pendingInvitationCount > 0 && (
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                {pendingInvitationCount}
              </Badge>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>View Profile</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Your Profile</DialogTitle>
                <DialogDescription>Account information and settings</DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-6">
                {/* Profile Avatar */}
                <div className="flex justify-center">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-blue-500 text-white text-2xl font-semibold">
                      {getInitials(user.name || "U")}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Profile Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Name
                    </label>
                    <p className="text-base font-medium text-foreground mt-1">
                      {user.name}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      Email
                    </label>
                    <p className="text-base font-medium text-foreground mt-1 break-all">
                      {user.email}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase">
                      User ID
                    </label>
                    <p className="text-xs font-mono text-muted-foreground mt-1 break-all">
                      {user.id}
                    </p>
                  </div>

                  {user.isOnline !== undefined && (
                    <div className="flex items-center gap-2 pt-2">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          user.isOnline ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {user.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <label className="text-sm font-medium text-foreground">
                    Theme
                  </label>
                  <ThemeToggle />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <DropdownMenuSeparator />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <LogOut className="mr-2 h-4 w-4 text-red-500" />
                <span className="text-red-600">Logout</span>
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Logout</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to logout? You will be redirected to the login page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onLogout}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
