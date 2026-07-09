import { Coffee } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border/60 mt-8 py-6 px-4 flex flex-col sm:flex-row items-center justify-center gap-3 text-center text-xs text-muted-foreground">
      <p>
        © 2026 AstroBoard · Creado por Álvaro Queizán. Apoya este proyecto invitándome a un café:
      </p>
      <a
        href="https://www.buymeacoffee.com/astrovulpem"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-md border border-black/20 px-3 py-1.5 text-sm font-medium text-black shadow-sm transition hover:brightness-95"
        style={{ backgroundColor: "#FFDD00", fontFamily: "'Cookie', cursive" }}
      >
        <Coffee className="w-4 h-4" />
        Buy me a coffee
      </a>
    </footer>
  );
}

export default Footer;