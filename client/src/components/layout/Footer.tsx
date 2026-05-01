import { Github } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { APP_VERSION, GITHUB_URL } from "@/config/app";

const footerLinks = [
  { label: "About", to: "/about" },
  { label: "Privacy", to: "/privacy" },
  { label: "Imprint", to: "/imprint" },
];

export function Footer() {
  const releaseUrl = GITHUB_URL
    ? `${GITHUB_URL}/releases/tag/client-v${APP_VERSION}`
    : undefined;

  return (
    <footer className="mt-auto border-t bg-muted/30">
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center gap-2 sm:gap-4 sm:flex-row sm:justify-between">
          <nav className="flex items-center md:gap-4">
            {footerLinks.map((link, index) => (
              <div key={link.to} className="flex items-center gap-4">
                <Link
                  to={link.to}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
                {index < footerLinks.length - 1 && (
                  <Separator orientation="vertical" className="h-4" />
                )}
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {releaseUrl ? (
              <a
                href={releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                v{APP_VERSION}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">v{APP_VERSION}</p>
            )}
            {GITHUB_URL && (
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="GitHub repository"
              >
                <Github className="size-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
