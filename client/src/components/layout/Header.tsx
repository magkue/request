import {
  ClipboardList,
  LogIn,
  LogOut,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import AETLogo from "@/assets/Logo_AET_schwarz_512x512.svg";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { APP_ENVIRONMENT, APP_NAME } from "@/config/app";
import { useAuth } from "@/hooks/useAuth";

export function Header() {
  const { isAuthenticated, user, login, logout } = useAuth();

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo and App Name */}
        <Link to="/" className="flex items-center gap-2">
          <img src={AETLogo} alt="AET Logo" className="h-8" />
          <span className="font-semibold">{APP_NAME}</span>
          {APP_ENVIRONMENT !== "production" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {APP_ENVIRONMENT}
            </span>
          )}
        </Link>

        {/* Auth Section */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/my-requests">
                <ClipboardList className="mr-2 h-4 w-4" />
                My Requests
              </Link>
            </Button>
            {user.isAdmin && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/external-links">
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {user.isAdmin ? (
                    <Shield className="h-4 w-4 text-primary" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="max-w-[150px] truncate">
                    {user.fullName ?? user.username}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="font-medium">
                      {user.fullName ?? user.username}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.isAdmin
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {user.isAdmin ? "Administrator" : "User"}
                    </span>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={logout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={login}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}
