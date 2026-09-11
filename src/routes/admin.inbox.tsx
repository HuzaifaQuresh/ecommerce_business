import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteInboxMessageFn,
  fetchInboxMessages,
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
import { Inbox, Mail, RefreshCw, Reply, Send, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/inbox")({
  component: AdminInbox,
});

function AdminInbox() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");

  const inbox = useQuery({
    queryKey: ["admin-inbox"],
    queryFn: () => fetchInboxMessages(),
    refetchInterval: 20_000,
  });

  const update = useMutation({
    mutationFn: (payload: { id: string; status: InboxStatus }) => updateInboxStatus({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-inbox"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInboxMessageFn({ data: { id } }),
    onSuccess: (_data, id) => {
      toast.success("Message deleted");
      const remaining = (inbox.data ?? []).filter((row) => row.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
      void qc.invalidateQueries({ queryKey: ["admin-inbox"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reply = useMutation({
    mutationFn: (payload: { id: string; body: string }) => replyInboxMessageFn({ data: payload }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-inbox"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const messages = inbox.data ?? [];
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

      {inbox.isError ? (
        <SectionCard>
          <p className="text-sm text-destructive">{(inbox.error as Error).message}</p>
        </SectionCard>
      ) : filtered.length === 0 && !query ? (
        <EmptyState
          icon={Inbox}
          title="Inbox is empty"
          description="New mail to info@smartzone.pk and website contact queries will appear here."
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
            onClick={onConfirm}
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
    composeUrl?: string;
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
    const popup = window.open("about:blank", "sz-gmail-send");
    try {
      const result = await onReply(body);
      if (result.delivered) {
        popup?.close();
        toast.success("Reply delivered to the customer from info@smartzone.pk");
        setReplyBody("");
        return;
      }
      if (result.composeUrl && popup && !popup.closed) {
        popup.location.href = result.composeUrl;
        toast.success("Reply saved. Click Send in Gmail to deliver it to the customer.");
      } else {
        popup?.close();
        toast.success("Reply saved. Open Gmail to deliver it to the customer.", {
          action: result.composeUrl
            ? {
                label: "Open Gmail",
                onClick: () => window.open(result.composeUrl, "_blank"),
              }
            : undefined,
        });
      }
      setReplyBody("");
    } catch (error) {
      popup?.close();
      toast.error(error instanceof Error ? error.message : "Could not send reply");
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
          placeholder="Write your reply. We deliver it to the customer, or open Gmail if needed."
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
