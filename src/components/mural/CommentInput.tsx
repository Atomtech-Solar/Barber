import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CommentInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  isSubmitting?: boolean;
}

export function CommentInput({ onSubmit, disabled, isSubmitting }: CommentInputProps) {
  const [text, setText] = useState("");

  const submit = () => {
    const t = text.trim();
    if (!t || disabled || isSubmitting) return;
    onSubmit(t);
    setText("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end pt-2 border-t border-border/60 mt-2">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escreva um comentário..."
        className="min-h-[44px] max-h-28 resize-y text-sm flex-1"
        rows={2}
        maxLength={2000}
        disabled={disabled || isSubmitting}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        className="shrink-0 h-10 w-10"
        disabled={disabled || isSubmitting || !text.trim()}
        aria-label="Enviar comentário"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
