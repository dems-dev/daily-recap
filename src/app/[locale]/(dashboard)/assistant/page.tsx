"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, getToolName, isToolUIPart } from "ai";
import { ArrowUp, Bot, Check, Loader2, RotateCcw, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/common";
import { ChatMarkdown } from "@/components/ai/ChatMarkdown";
import { useMe } from "@/hooks/use-me";
import { Link } from "@/i18n/routing";
import type { DataAgentMessage } from "@/lib/ai/data-agent";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["spendingThisMonth", "bestSleepWeek", "lastWorkout", "moodPattern", "overdueTasks", "savedWishlist"] as const;

function Chat() {
  const t = useTranslations("Assistant");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop, error, regenerate, setMessages } = useChat<DataAgentMessage>({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const send = (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col gap-4">
      <div className="flex-1 space-y-4">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 py-6">
              <div className="flex items-start gap-3">
                <Bot className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p className="text-sm leading-relaxed">{t("intro")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((key) => (
                  <Button key={key} variant="outline" size="sm" className="h-auto whitespace-normal py-1.5 text-left" onClick={() => send(t(`suggestions.${key}`))}>
                    {t(`suggestions.${key}`)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-4" aria-live="polite">
            {messages.map((message) => (
              <li key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") return <ChatMarkdown key={i} text={part.text} />;
                    if (isToolUIPart(part)) {
                      const name = getToolName(part);
                      const done = part.state === "output-available";
                      const failed = part.state === "output-error";
                      return (
                        <p key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          {done ? (
                            <Check className="size-3.5" aria-hidden />
                          ) : failed ? null : (
                            <Loader2 className="size-3.5 animate-spin" aria-hidden />
                          )}
                          {t(failed ? "toolFailed" : done ? "toolDone" : "toolRunning", {
                            tool: t.has(`tools.${name}`) ? t(`tools.${name}`) : name,
                          })}
                        </p>
                      );
                    }
                    return null;
                  })}
                </div>
              </li>
            ))}
            {status === "submitted" && (
              <li className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden /> {t("thinking")}
                </div>
              </li>
            )}
          </ul>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/40 p-3 text-sm" role="alert">
            <span className="flex-1">{t("error")}</span>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => regenerate()}>
              <RotateCcw /> {t("retry")}
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="sticky bottom-0 flex items-end gap-2 bg-background pb-1 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <Textarea
          value={input}
          rows={1}
          maxLength={1000}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="max-h-40 min-h-10 resize-none"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {busy ? (
          <Button type="button" size="icon" variant="outline" onClick={() => stop()} aria-label={t("stop")}>
            <Square />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label={t("send")}>
            <ArrowUp />
          </Button>
        )}
        {messages.length > 0 && !busy && (
          <Button type="button" size="icon" variant="ghost" onClick={() => setMessages([])} aria-label={t("clear")}>
            <Trash2 />
          </Button>
        )}
      </form>
      <p className="text-center text-xs text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}

export default function AssistantPage() {
  const t = useTranslations("Assistant");
  const { data: me } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title={t("pageTitle")} />
      {!me ? (
        <Skeleton className="h-48" />
      ) : me.aiEnabled ? (
        <Chat />
      ) : (
        <Card>
          <CardContent className="space-y-2 py-6 text-sm">
            <p>{me.aiAvailable ? t("disabledByUser") : t("notConfigured")}</p>
            {me.aiAvailable && (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/settings" />}>
                {t("openSettings")}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
