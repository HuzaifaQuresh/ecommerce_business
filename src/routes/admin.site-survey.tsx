import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  deleteInboxMessageFn,
  fetchInboxMessages,
  forwardSiteSurveyFn,
  replyInboxMessageFn,
  updateInboxStatus,
} from "@/api/inbox";
import {
  inboxSourceLabel,
  isSiteSurveyMessage,
  surveyMapsUrl,
  type InboxMessage,
  type InboxStatus,
} from "@/lib/inbox";
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
import {
  ClipboardList,
  ExternalLink,
  MapPin,
  RefreshCw,
  Reply,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";

export const Route = createFileRoute("/admin/site-survey")({
  component: AdminSiteSurvey,
});

function AdminSiteSurvey() {
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

  const update = useMutation({
    mutationFn: (payload: { id: string; status: InboxStatus }) => updateInboxStatus({ data: payload }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-inbox"] }),
    onError: (error: Error) => {
      if (/message not found/i.test(error.message)) return;
      toast.error(error.message);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteInboxMessageFn({ data: { id } }),
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
        return remaining.filter(isSiteSurveyMessage)[0]?.id ?? null;
      });
      setMobilePane("list");
      return { previous };
    },
    onSuccess: () => {
      toast.success("Request deleted");
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
      toast.error(error.message || "Could not delete request");
    },
  });

  const reply = useMutation({
    mutationFn: (payload: { id: string; body: string }) => replyInboxMessageFn({ data: payload }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-inbox"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const forward = useMutation({
    mutationFn: (payload: { id: string; toEmail: string; note?: string }) =>
      forwardSiteSurveyFn({ data: payload }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin-inbox"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  const surveys = useMemo(
    () => (inbox.data ?? []).filter(isSiteSurveyMessage).filter((row) => !hiddenIds.has(row.id)),
    [inbox.data, hiddenIds],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return surveys;
    return surveys.filter((row) =>
      [
        row.subject,
        row.from_email,
        row.from_name,
        row.body,
        row.meta?.address,
        row.meta?.city,
        row.meta?.phone,
        row.meta?.solution,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [surveys, query]);

  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null;
  const unread = surveys.filter((row) => row.status === "unread").length;

  return (
    <div>
      <DashboardPageHeader
        title="Site Survey"
        description="Customer survey requests with address / map pin. Reply by email or forward to a field engineer."
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
          icon={ClipboardList}
          title="No site survey requests yet"
          description="Requests from IoT Solutions “Request a site survey” (with address) appear here."
        />
      ) : (
        <div className="grid lg:grid-cols-[22rem_minmax(0,1fr)] gap-4">
          <SectionCard
            className={`p-0 overflow-hidden ${mobilePane === "detail" ? "hidden lg:block" : ""}`}
          >
            <div className="p-3 border-b space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Requests</p>
                <Badge variant="secondary">{unread} unread</Badge>
              </div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, address, city…"
                className="h-9"
              />
            </div>
            <ul className="divide-y max-h-[70vh] overflow-y-auto">
              {filtered.map((row) => (
                <li key={row.id} className={selected?.id === row.id ? "bg-muted" : ""}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(row.id);
                      setMobilePane("detail");
                      if (row.status === "unread") {
                        update.mutate({ id: row.id, status: "read" });
                      }
                    }}
                    className="w-full text-left px-3 py-3 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${row.status === "unread" ? "font-semibold" : ""}`}>
                        {row.from_name || row.from_email}
                      </p>
                      {row.status === "unread" && (
                        <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{row.subject}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {row.meta?.address || row.meta?.city || "Address in message"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {inboxSourceLabel(row.source)} · {new Date(row.created_at).toLocaleString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard className={mobilePane === "list" ? "hidden lg:block" : ""}>
            {selected ? (
              <SurveyDetail
                message={selected}
                busy={update.isPending || remove.isPending || reply.isPending || forward.isPending}
                sending={reply.isPending}
                forwarding={forward.isPending}
                onBack={() => setMobilePane("list")}
                onStatus={(status) => update.mutate({ id: selected.id, status })}
                onDelete={() => {
                  remove.mutate(selected.id);
                  setMobilePane("list");
                }}
                onReply={(body) => reply.mutateAsync({ id: selected.id, body })}
                onForward={(toEmail, note) =>
                  forward.mutateAsync({ id: selected.id, toEmail, note })
                }
              />
            ) : (
              <EmptyState icon={ClipboardList} title="Select a survey request" />
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function SurveyDetail({
  message,
  busy,
  sending,
  forwarding,
  onBack,
  onStatus,
  onDelete,
  onReply,
  onForward,
}: {
  message: InboxMessage;
  busy: boolean;
  sending: boolean;
  forwarding: boolean;
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
  onForward: (
    toEmail: string,
    note?: string,
  ) => Promise<{
    ok: true;
    delivered: boolean;
    adminRelay?: boolean;
    composeUrl?: string;
    detail?: string;
  }>;
}) {
  const [replyBody, setReplyBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [forwardNote, setForwardNote] = useState("");
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const maps = surveyMapsUrl(message.meta);
  const meta = message.meta;

  useEffect(() => {
    setReplyBody("");
    setForwardNote("");
  }, [message.id]);

  const explainResult = (
    result: {
      delivered: boolean;
      adminRelay?: boolean;
      composeUrl?: string;
      detail?: string;
    },
    okLabel: string,
  ) => {
    if (result.delivered && !result.adminRelay) {
      toast.success(okLabel);
      return;
    }
    if (result.delivered && result.adminRelay) {
      toast.message(
        "Cloudflare only delivers to your verified Gmail. Copy is in your inbox (Reply-To set) — open Gmail to finish sending.",
        {
          duration: 10_000,
          action: result.composeUrl
            ? {
                label: "Open Gmail",
                onClick: () => window.open(result.composeUrl, "_blank", "noopener,noreferrer"),
              }
            : undefined,
        },
      );
      if (result.composeUrl) window.open(result.composeUrl, "_blank", "noopener,noreferrer");
      return;
    }
    toast.error(result.detail || "Could not auto-send. Open Gmail to deliver.", {
      duration: 10_000,
      action: result.composeUrl
        ? {
            label: "Open Gmail",
            onClick: () => window.open(result.composeUrl, "_blank", "noopener,noreferrer"),
          }
        : undefined,
    });
    if (result.composeUrl) window.open(result.composeUrl, "_blank", "noopener,noreferrer");
  };

  const sendReply = async () => {
    const body = replyBody.trim();
    if (!body) {
      toast.error("Write a reply first");
      return;
    }
    try {
      const result = await onReply(body);
      explainResult(result, "Reply delivered from info@smartzone.pk");
      setReplyBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send reply");
    }
  };

  const sendForward = async () => {
    const to = assignee.trim();
    if (!to.includes("@")) {
      toast.error("Enter the assignee email");
      return;
    }
    try {
      const result = await onForward(to, forwardNote.trim() || undefined);
      explainResult(result, `Survey mailed to ${to}`);
      setForwardNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not forward");
    }
  };

  return (
    <div className="space-y-4">
      <Button type="button" variant="ghost" size="sm" className="lg:hidden -ml-2" onClick={onBack}>
        ← Requests
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-tight">{message.subject}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {message.from_name ? `${message.from_name} · ` : ""}
            <a className="underline underline-offset-2" href={`mailto:${message.from_email}`}>
              {message.from_email}
            </a>
            {meta?.phone ? (
              <>
                {" · "}
                <a className="underline underline-offset-2" href={`tel:${meta.phone}`}>
                  {meta.phone}
                </a>
              </>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {inboxSourceLabel(message.source)} · {new Date(message.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("unread")}>
            Unread
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onStatus("archived")}>
            Archive
          </Button>
          <DeleteSurveyButton disabled={busy} onConfirm={onDelete} />
        </div>
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50/70 p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-[#0B192C] flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-[#FF7A00]" />
            Site location
          </p>
          {maps ? (
            <Button asChild size="sm" variant="outline" className="h-8">
              <a href={maps} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open maps
              </a>
            </Button>
          ) : null}
        </div>
        <p className="text-sm text-[#0B192C]">
          {[meta?.address, meta?.area, meta?.city].filter(Boolean).join(", ") ||
            "See address details in the message body."}
        </p>
        {typeof meta?.lat === "number" && typeof meta?.lng === "number" ? (
          <p className="text-[11px] font-mono text-muted-foreground">
            Pin {meta.lat}, {meta.lng}
          </p>
        ) : null}
        {meta?.solution ? (
          <p className="text-xs text-muted-foreground">Solution: {meta.solution}</p>
        ) : null}
        {maps && typeof meta?.lat === "number" && typeof meta?.lng === "number" ? (
          <iframe
            title="Survey map"
            className="mt-2 h-44 w-full rounded-md border border-orange-100 bg-white"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${meta.lng - 0.01}%2C${meta.lat - 0.01}%2C${meta.lng + 0.01}%2C${meta.lat + 0.01}&layer=mapnik&marker=${meta.lat}%2C${meta.lng}`}
          />
        ) : null}
      </div>

      <div className="rounded-lg border border-[#0052B4]/20 bg-[#0052B4]/5 p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Reply className="h-4 w-4 text-[#0052B4]" />
          <Label className="text-sm font-semibold">Message customer</Label>
        </div>
        <Textarea
          ref={replyRef}
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Confirm survey slot, ask for gate access, share engineer ETA…"
          className="min-h-28 bg-white"
          disabled={sending}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            className="bg-[#0052B4] hover:bg-[#003D86]"
            disabled={sending || !replyBody.trim()}
            onClick={() => void sendReply()}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {sending ? "Sending…" : "Send email"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 sm:p-4 space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-emerald-700" />
          <Label className="text-sm font-semibold">Mail relevant person (field / ops)</Label>
        </div>
        <Input
          type="email"
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          placeholder="engineer@company.com"
          className="bg-white h-10"
          disabled={forwarding}
        />
        <Textarea
          value={forwardNote}
          onChange={(e) => setForwardNote(e.target.value)}
          placeholder="Optional note for the assignee"
          className="min-h-20 bg-white"
          disabled={forwarding}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-300"
            disabled={forwarding || !assignee.trim()}
            onClick={() => void sendForward()}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {forwarding ? "Sending…" : "Forward survey"}
          </Button>
        </div>
      </div>

      <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans bg-muted/40 rounded-lg p-4">
        {message.body || "(empty message)"}
      </pre>

      {(message.replies ?? []).length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Activity
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

function DeleteSurveyButton({
  disabled,
  onConfirm,
}: {
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive" disabled={disabled}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this survey request?</AlertDialogTitle>
          <AlertDialogDescription>
            Removes it from Site Survey. The customer is not notified.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
