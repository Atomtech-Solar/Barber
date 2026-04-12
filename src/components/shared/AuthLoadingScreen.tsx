/**
 * Estado de carregamento consistente enquanto sessão/perfil são resolvidos.
 */
export function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-4">
      <div
        className="size-9 rounded-full border-2 border-muted border-t-primary animate-spin"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">Carregando sessão…</p>
    </div>
  );
}
