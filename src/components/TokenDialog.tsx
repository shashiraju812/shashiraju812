import { useState, useSyncExternalStore, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { getRate, getToken, setToken, subscribeRate } from "@/lib/github";
import { relativeTime } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function TokenDialog({ open, onOpenChange, onChanged }: Props) {
  const rate = useSyncExternalStore(subscribeRate, getRate);
  const [value, setValue] = useState("");
  const hasToken = !!getToken();

  const save = (e: FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    setToken(t);
    setValue("");
    onOpenChange(false);
    onChanged();
  };

  const remove = () => {
    setToken("");
    setValue("");
    onOpenChange(false);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="space-y-1.5 pr-6">
          <DialogTitle>GitHub access token</DialogTitle>
          <DialogDescription>
            Optional. Anonymous requests are limited to 60 per hour; with a token you get 5,000. A token with no scopes
            is enough, since only public data is read.
          </DialogDescription>
        </div>

        <form onSubmit={save} className="grid gap-3">
          <label htmlFor="gh-token" className="text-sm font-medium">
            Personal access token
          </label>
          <Input
            id="gh-token"
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={hasToken ? "A token is saved — paste a new one to replace it" : "github_pat_… or ghp_…"}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Stored only in this browser's localStorage and sent only to api.github.com.{" "}
            <a
              href="https://github.com/settings/personal-access-tokens/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2"
            >
              Create one <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </p>

          {rate && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              <strong className="font-medium text-foreground">
                {rate.remaining} of {rate.limit}
              </strong>{" "}
              requests left this hour — resets {relativeTime(rate.resetAt)}.
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {hasToken && (
              <Button type="button" variant="outline" onClick={remove}>
                Remove token
              </Button>
            )}
            <Button type="submit" disabled={!value.trim()}>
              Save token
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
