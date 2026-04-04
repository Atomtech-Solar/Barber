import { useMemo, useRef, useState } from "react";
import { Megaphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { MentionCandidate } from "@/lib/mural-mentions";
import { MURAL_GLOBAL_TODOS_TOKEN } from "@/lib/mural-mentions";

interface MentionTextareaProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  candidates: MentionCandidate[];
  /** Ex.: @todos no topo da lista para aviso global (notifica toda a equipe) */
  showGlobalTeamOption?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

function globalMentionMatchesQuery(fragment: string): boolean {
  const q = fragment.toLowerCase().trim();
  if (q === "") return true;
  if (MURAL_GLOBAL_TODOS_TOKEN.startsWith(q) || q.startsWith(MURAL_GLOBAL_TODOS_TOKEN)) return true;
  if (q.length >= 3) {
    if ("toda".startsWith(q) || q.startsWith("toda")) return true;
    if ("equipe".startsWith(q) || q.startsWith("equip")) return true;
    if ("geral".startsWith(q) || q.startsWith("geral")) return true;
    if ("global".startsWith(q) || q.startsWith("glob")) return true;
  }
  return false;
}

export function MentionTextarea({
  id,
  value,
  onChange,
  candidates,
  showGlobalTeamOption = true,
  placeholder,
  className,
  disabled,
  maxLength,
}: MentionTextareaProps) {
  const [open, setOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const atIndexRef = useRef<number | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const showGlobalOption = showGlobalTeamOption && globalMentionMatchesQuery(mentionQuery);

  const filteredPeople = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    const base = q
      ? candidates.filter((c) => c.full_name.toLowerCase().includes(q))
      : candidates;
    return base.slice(0, 10);
  }, [candidates, mentionQuery]);

  const syncMentionState = (text: string, cursor: number) => {
    const before = text.slice(0, cursor);
    const at = before.lastIndexOf("@");
    if (at === -1) {
      setOpen(false);
      atIndexRef.current = null;
      return;
    }
    const fragment = before.slice(at + 1);
    if (fragment.includes(" ") || fragment.includes("\n")) {
      setOpen(false);
      atIndexRef.current = null;
      return;
    }
    atIndexRef.current = at;
    setMentionQuery(fragment);
    setOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    syncMentionState(e.target.value, e.target.selectionStart);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    syncMentionState(el.value, el.selectionStart ?? 0);
  };

  const insertMention = (name: string) => {
    const el = taRef.current;
    if (atIndexRef.current === null || !el) return;
    const cursor = el.selectionStart ?? value.length;
    const before = value.slice(0, atIndexRef.current);
    const after = value.slice(cursor);
    const inserted = `@${name} `;
    const next = before + inserted + after;
    onChange(next);
    setOpen(false);
    atIndexRef.current = null;
    requestAnimationFrame(() => {
      el.focus();
      const pos = before.length + inserted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const listEmpty = !showGlobalOption && filteredPeople.length === 0;

  return (
    <div className="relative">
      <Textarea
        ref={taRef}
        id={id}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 180);
        }}
        placeholder={placeholder}
        className={cn("min-h-[120px]", className)}
        maxLength={maxLength}
        disabled={disabled}
      />
      {open && (
        <div
          className="absolute z-50 left-0 right-0 top-full mt-1 rounded-lg border bg-popover text-popover-foreground shadow-md max-h-56 overflow-y-auto scrollbar-theme"
          role="listbox"
          aria-label="Mencionar pessoa ou equipe"
          onMouseDown={(e) => e.preventDefault()}
        >
          {listEmpty ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Ninguém encontrado</p>
          ) : (
            <div className="py-1">
              {showGlobalOption && (
                <button
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted/80 transition-colors border-b border-border/60 flex gap-3 items-start"
                  onClick={() => insertMention(MURAL_GLOBAL_TODOS_TOKEN)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-700 dark:text-sky-400 mt-0.5">
                    <Megaphone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="font-medium text-foreground block">Toda a equipe</span>
                    <span className="text-xs text-muted-foreground">
                      @{MURAL_GLOBAL_TODOS_TOKEN} — notifica todos os membros (avisos gerais)
                    </span>
                  </span>
                </button>
              )}
              {filteredPeople.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="option"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted/80 transition-colors"
                  onClick={() => insertMention(c.full_name)}
                >
                  {c.full_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
