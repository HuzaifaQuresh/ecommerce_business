import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteInboxMessageFn,
  fetchInboxMessages,
  fetchOutboundMailHealth,
  replyInboxMessageFn,
  updateInboxStatus,
} from "@/api/inbox";
import { inboxSourceLabel, type InboxMessage, type InboxStatus } from "@/lib/inbox";
import { DashboardPageHeader, EmptyState, SectionCard } from "@/components/site/PageLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { AlertTriangle, Inbox, Mail, RefreshCw, Reply, Send, Trash2 } from "lucide-react";
import { buildGmailComposeUrl } from "@/lib/gmail-compose";

export const Route = createFileRoute("/admin/inbox")({
  component: AdminInbox,
});

function AdminInbox() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

  const inbox = useQuery({
    queryKey: ["admin-inbox"],
    queryFn: () => fetchInboxMessages(),
    refetchInterval: 20_000,
  });

  const mailHealth = useQuery({
    queryKey: ["admin-mail-health"],
    queryFn: () => fetchOutboundMailHealth(),
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; status: InboxStatus }) => updateInboxStatus({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-inbox"] });
    },
    onError: (error: Error) => {
      if (/message not found/i.test(error.message)) return;
      toast.error(error.message);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteInboxMessageFn({ data: { id } });
      return result;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["admin-inbox"] });
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      const previous = qc.getQueryData<InboxMessage[]>(["admin-inbox"]);
      const remaining = (previous ?? []).filter((row) => row.id !== id);
      qc.setQueryData(["admin-inbox"], remaining);
      setSelectedId((current) => {
        if (current !== id) return current;
        return remaining[0]?.id ?? null;
      });
      setMobilePane("list");
      return { previous };
    },
    onSuccess: () => {
      toast.success("Message deleted");
      // Delay refetch slightly so KV index write is visible
      window.setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["admin-inbox"] });
      }, 400);
    },
    onError: (error: Error, id, context) => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (context?.previous) qc.setQueryData(["admin-inbox"], context.previous);
      toast.error(error.message || "Could not delete message");
    },
  });

  const reply = useMutation({
    mutationFn: (payload: { id: string; body: string }) => replyInboxMessageFn({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-inbox"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const messages = useMemo(
    () => (inbox.data ?? []).filter((row) => !hiddenIds.has(row.id)),
    [inbox.data, hiddenIds],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((row) =>
      [row.subject, row.from_email, row.from_name, row.body, row.source]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [messages, query]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const unread = messages.filter((row) => row.status === "unread").length;

  return (
    <div>
      <DashboardPageHeader
        title="Inbox"
        description="info@smartzone.pk, contact form, and IoT consultation requests."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void inbox.refetch()}
            disabled={inbox.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${inbox.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {mailHealth.data && !mailHealth.data.customerDirectSend ? (
        <SectionCard className="mb-4 border-amber-200 bg-amber-50/80">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-amber-950">Customer email delivery is not live</p>
              <p className="text-amber-900/90 leading-relaxed">{mailHealth.data.hint}</p>
              <p className="text-amber-900/80 text-xs leading-relaxed">
                Run{" "}
                <code className="rounded bg-white/80 px-1 py-0.5 text-[11px]">
                  npx wrangler secret put RESEND_API_KEY
                </code>{" "}
                for worker <code className="rounded bg-white/80 px-1 py-0.5 text-[11px]">ecommerce-business</code>
                , verify <code className="rounded bg-white/80 px-1 py-0.5 text-[11px]">smartzone.pk</code> on
                resend.com, then redeploy. Until then, replies only reach{" "}
                {mailHealth.data.adminNotifyTarget} (Gmail relay / compose).
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {inbox.isError ? (
        <SectionCard>
          <p className="text-sm text-destructive">{(inbox.error as Error).message}</p>
        </SectionCard>
      ) : filtered.length === 0 && !query ? (
        <EmptyState
          icon={Inbox}
          title="Inbox is empty"
          description="New mail to info@smartzone.pk, contact form, and IoT leads appear here. Tip: Cloudflare blocks mail sent FROM your verified Gmail TO info@ (loop protection) — test from another address."
        />
      ) : (
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-4">
          <SectionCard
            className={`p-0 overflow-hidden ${mobilePane === "detail" ? "hidden lg:block" : ""}`}
          >
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Messages</p>
                <Badge variant="secondary">{unread} unread</Badge>
              </div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sender or subject"
                className="h-9"
              />
            </div>
            <ul className="divide-y max-h-[70vh] overflow-y-auto">
              {filtered.map((row) => (
                <li key={row.id} className={selected?.id === row.id ? "bg-muted" : ""}>
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(row.id);
                        setMobilePane("detail");
                        if (row.status === "unread") {
                          update.mutate({ id: row.id, status: "read" });
                        }
                      }}
                      className="min-w-0 flex-1 text-left px-3 py-3 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm truncate ${row.status === "unread" ? "font-semibold" : ""}`}
                        >
                          {row.from_name || row.from_email}
                        </p>
                        {row.status === "unread" && (
                          <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{row.subject}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {inboxSourceLabel(row.source)} · {new Date(row.created_at).toLocaleString()}
                        {row.replies?.length ? ` · ${row.replies.length} sent` : ""}
                      </p>
                    </button>
                    <div className="flex flex-col justify-center gap-1 pr-2 py-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelectedId(row.id);
                          setMobilePane("detail");
                          if (row.status === "unread") {
                            update.mutate({ id: row.id, status: "read" });
                          }
                        }}
                      >
                        <Reply className="h-3.5 w-3.5" />
                        <span className="sr-only">Reply</span>
                      </Button>
                      <DeleteMessageButton
                        disabled={remove.isPending}
                        onConfirm={() => remove.mutate(row.id)}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard className={mobilePane === "list" ? "hidden lg:block" : ""}>
            {selected ? (
              <MessageDetail
                message={selected}
                busy={update.isPending || remove.isPending || reply.isPending}
                sending={reply.isPending}
                onBack={() => setMobilePane("list")}
                onStatus={(status) => update.mutate({ id: selected.id, status })}
                onDelete={() => {
                  remove.mutate(selected.id);
                  setMobilePane("list");
                }}
                onReply={(body) => reply.mutateAsync({ id: selected.id, body })}
              />
            ) : (
              <EmptyState icon={Mail} title="Select a message" />
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function DeleteMessageButton({
  disabled,
  onConfirm,
  label = false,
}: {
  disabled?: boolean;
  onConfirm: () => void;
  label?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={disabled}
          className={label ? "" : "h-8 px-2"}
        >
          <Trash2 className={`h-3.5 w-3.5 ${label ? "mr-1.5" : ""}`} />
          {label ? "Delete" : <span className="sr-only">Delete</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this message?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes it from the SmartZone inbox. The customer will not be notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onConfirm()}
          >
            Delete message
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MessageDetail({
  message,
  busy,
  sending,
  onBack,
  onStatus,
  onDelete,
  onReply,
}: {
  message: InboxMessage;
  busy: boolean;
  sending: boolean;
  onBack: () => void;
  onStatus: (status: InboxStatus) => void;
  onDelete: () => void;
  onReply: (body: string) => Promise<{
    ok: true;
    delivered: boolean;
    adminRelay?: boolean;
    composeUrl?: string;
    detail?: string;
  }>;
}) {
  const [replyBody, setReplyBody] = useState("");
  const replyRef = useRef<HTMLTextAreaElement | null>(null);

  const send = async () => {
    const body = replyBody.trim();
    if (!body) {
      toast.error("Write a reply first");
      return;
    }
    try {
      const result = await onReply(body);
      setReplyBody("");

      if (result.delivered && !result.adminRelay) {
        toast.success("Reply emailed to the customer from info@smartzone.pk");
        return;
      }

      const composeUrl =
        result.composeUrl ||
        buildGmailComposeUrl({
          toEmail: message.from_email,
          subject: message.subject,
          body,
        });

      if (result.delivered && result.adminRelay) {
        toast.message("Reply saved. A copy is in your Gmail — open compose to finish delivery to the customer.", {
          duration: 12_000,
          action: {
            label: "Open Gmail",
            onClick: () => window.open(composeUrl, "_blank", "noopener,noreferrer"),
          },
        });
        window.open(composeUrl, "_blank", "noopener,noreferrer");
        return;
      }

      toast.message("Reply saved in Inbox. Open Gmail to deliver it to the customer.", {
        duration: 12_000,
        action: {
          label: "Open Gmail",
          onClick: () => window.open(composeUrl, "_blank", "noopener,noreferrer"),
        },
      });
      window.open(composeUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Could not send reply";
      const composeUrl = buildGmailComposeUrl({
        toEmail: message.from_email,
        subject: message.subject,
        body,
      });
      toast.error(detail, {
        duration: 12_000,
        action: {
          label: "Open Gmail",
          onClick: () => window.open(composeUrl, "_blank", "noopener,noreferrer"),
        },
      });
      window.open(composeUrl, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    setReplyBody("");
  }, [message.id]);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="lg:hidden -ml-2"
        onClick={onBack}
      >
        ← Messages
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{message.subject}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {message.from_name ? `${message.from_name} · ` : ""}
            <a className="underline underline-offset-2" href={`mailto:${message.from_email}`}>
              {message.from_email}
            </a>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            To {message.to_email} · {inboxSourceLabel(message.source)} ·{" "}
            {new Date(message.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("unread")}>
            Unread
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("archived")}>
            Archive
          </Button>
          <DeleteMessageButton disabled={busy} onConfirm={onDelete} label />
        </div>
      </div>

      <div className="rounded-lg border border-[#0052B4]/20 bg-[#0052B4]/5 p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Reply className="h-4 w-4 text-[#0052B4]" />
          <Label className="text-sm font-semibold">Reply to {message.from_email}</Label>
        </div>
        <Textarea
          ref={replyRef}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Write your reply and click Send…"
          className="min-h-28 bg-white"
          disabled={sending}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            className="bg-[#0052B4] hover:bg-[#003D86]"
            disabled={sending || !replyBody.trim()}
            onClick={send}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {sending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      </div>

      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/40 rounded-lg p-4">
        {message.body || "(empty message)"}
      </pre>

      {(message.replies ?? []).length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sent replies
          </p>
          {message.replies?.map((item) => (
            <div key={item.id} className="rounded-lg border bg-sky-50/60 border-sky-100 p-3">
              <p className="text-[11px] text-muted-foreground mb-1">
                {item.from_email} · {new Date(item.sent_at).toLocaleString()}
              </p>
              <p className="text-sm whitespace-pre-wrap">{item.body}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
