"use client";

import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import {
  CornerDownRight,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Send,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";

export interface MarketplaceCommentItem {
  id: string;
  fnId: string;
  authorUserId: string;
  authorName: string;
  authorImage: string | null;
  parentCommentId: string | null;
  body: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface CommentsThreadProps {
  fnId: string;
  initialComments: MarketplaceCommentItem[];
  signedIn: boolean;
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserImage: string | null;
  ownerAuthorName: string | null;
}

const MAX_COMMENT_LENGTH = 2000;
const MIN_COMMENT_LENGTH = 2;

interface ThreadComment extends MarketplaceCommentItem {
  pending?: boolean;
  optimisticId?: string;
}

interface ThreadNode {
  comment: ThreadComment;
  replies: ThreadComment[];
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function buildThreads(comments: ThreadComment[]): ThreadNode[] {
  const byId = new Map<string, ThreadNode>();
  const roots: ThreadNode[] = [];

  for (const comment of comments) {
    byId.set(comment.id, { comment, replies: [] });
  }

  for (const comment of comments) {
    const node = byId.get(comment.id);
    if (!node) continue;
    if (comment.parentCommentId && byId.has(comment.parentCommentId)) {
      const parent = byId.get(comment.parentCommentId);
      parent?.replies.push(node.comment);
    } else {
      roots.push(node);
    }
  }

  for (const node of roots) {
    node.replies.sort((a, b) => toDate(a.createdAt).getTime() - toDate(b.createdAt).getTime());
  }
  roots.sort(
    (a, b) => toDate(b.comment.createdAt).getTime() - toDate(a.comment.createdAt).getTime(),
  );

  return roots;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.slice(0, 1).toUpperCase()).join("") || "?";
}

function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 70%, 35%))`;
}

function Avatar({
  name,
  image,
  size = 36,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={size}
        height={size}
        className="rounded-full border border-[var(--color-border)] object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white text-xs uppercase"
      style={{
        width: size,
        height: size,
        background: avatarGradient(name),
        fontSize: size * 0.36,
      }}
    >
      {getInitials(name)}
    </div>
  );
}

function RelativeTime({ value }: { value: string | Date }) {
  const date = toDate(value);
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((tick) => tick + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString()}
      className="text-[var(--color-bone-faint)] text-xs"
    >
      {formatDistanceToNow(date, { addSuffix: true })}
    </time>
  );
}

function autoSize(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "0px";
  const next = Math.min(el.scrollHeight, 320);
  el.style.height = `${Math.max(next, 96)}px`;
}

export function CommentsThread({
  fnId,
  initialComments,
  signedIn,
  currentUserId,
  currentUserName,
  currentUserImage,
  ownerAuthorName,
}: CommentsThreadProps) {
  const router = useRouter();
  const [comments, setComments] = useState<ThreadComment[]>(() =>
    initialComments.map((c) => ({ ...c })),
  );
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setComments(initialComments.map((c) => ({ ...c })));
  }, [initialComments]);

  const threads = useMemo(() => buildThreads(comments), [comments]);
  const totalCount = comments.length;

  const postComment = useCallback(
    async (body: string, parentCommentId: string | null) => {
      if (!signedIn || !currentUserId) {
        const url = `/login?next=${encodeURIComponent(`/marketplace/${fnId}`)}`;
        router.push(url);
        return false;
      }
      const trimmed = body.trim();
      if (trimmed.length < MIN_COMMENT_LENGTH) return false;

      const optimisticId = `optimistic_${crypto.randomUUID()}`;
      const now = new Date();
      const optimistic: ThreadComment = {
        id: optimisticId,
        fnId,
        authorUserId: currentUserId,
        authorName: currentUserName ?? "You",
        authorImage: currentUserImage,
        parentCommentId,
        body: trimmed,
        createdAt: now,
        updatedAt: now,
        pending: true,
        optimisticId,
      };
      setComments((prev) => [...prev, optimistic]);

      try {
        const response = await fetch(`/api/functions/${fnId}/comments`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body: trimmed, parentCommentId }),
        });
        if (!response.ok) {
          if (response.status === 401) {
            router.push(`/login?next=${encodeURIComponent(`/marketplace/${fnId}`)}`);
            return false;
          }
          throw new Error("post_failed");
        }
        const result = (await response.json()) as { id: string };
        setComments((prev) =>
          prev.map((c) => {
            if (c.optimisticId !== optimisticId) return c;
            const { optimisticId: _omit, pending: _pending, ...rest } = c;
            return { ...rest, id: result.id };
          }),
        );
        toast.success(parentCommentId ? "Reply posted" : "Comment posted");
        router.refresh();
        return true;
      } catch (_err) {
        setComments((prev) => prev.filter((c) => c.optimisticId !== optimisticId));
        toast.error("Couldn't post comment. Try again.");
        return false;
      }
    },
    [fnId, signedIn, currentUserId, currentUserName, currentUserImage, router],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      setPendingDelete(commentId);
      const previous = comments;
      setComments((prev) =>
        prev.filter((c) => c.id !== commentId && c.parentCommentId !== commentId),
      );
      startTransition(async () => {
        try {
          const response = await fetch(`/api/functions/${fnId}/comments/${commentId}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("delete_failed");
          toast.success("Comment deleted");
          router.refresh();
        } catch (_err) {
          setComments(previous);
          toast.error("Couldn't delete comment.");
        } finally {
          setPendingDelete(null);
        }
      });
    },
    [comments, fnId, router],
  );

  const copyLink = useCallback((commentId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${commentId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Comment link copied"))
      .catch(() => toast.error("Couldn't copy link"));
  }, []);

  return (
    <div className="space-y-6" id="comments">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-3xl text-[var(--color-bone)]">Discussion</h2>
          <span className="rounded-full border border-[var(--color-border)] bg-white/[0.04] px-2.5 py-0.5 text-[var(--color-bone-muted)] text-xs">
            {totalCount}
          </span>
        </div>
      </div>

      <Composer
        fnId={fnId}
        signedIn={signedIn}
        currentUserName={currentUserName}
        currentUserImage={currentUserImage}
        onSubmit={(body) => postComment(body, null)}
      />

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border)] border-dashed bg-black/10 p-10 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/[0.05]">
            <MessageSquare className="size-5 text-[var(--color-bone-faint)]" />
          </div>
          <p className="mt-4 font-display text-[var(--color-bone)] text-xl">
            Start the conversation.
          </p>
          <p className="mx-auto mt-2 max-w-md text-[var(--color-bone-muted)] text-sm">
            Share a use case, ask a question, or suggest an improvement. Be the first to comment on
            this function.
          </p>
        </div>
      ) : (
        <ul className="space-y-5">
          {threads.map((node) => (
            <li key={node.comment.id} id={node.comment.id} className="scroll-mt-28">
              <CommentCard
                comment={node.comment}
                isOwner={ownerAuthorName !== null && node.comment.authorName === ownerAuthorName}
                isAuthor={currentUserId !== null && node.comment.authorUserId === currentUserId}
                isReplying={replyingTo === node.comment.id}
                onReply={() =>
                  setReplyingTo(replyingTo === node.comment.id ? null : node.comment.id)
                }
                onDelete={() => deleteComment(node.comment.id)}
                onCopyLink={() => copyLink(node.comment.id)}
                deleting={pendingDelete === node.comment.id}
              />

              {(node.replies.length > 0 || replyingTo === node.comment.id) && (
                <div className="mt-4 ml-5 space-y-4 border-[var(--color-border)] border-l pl-5 sm:ml-6 sm:pl-6">
                  {node.replies.map((reply) => (
                    <div key={reply.id} id={reply.id} className="scroll-mt-28">
                      <CommentCard
                        comment={reply}
                        isReply
                        isOwner={ownerAuthorName !== null && reply.authorName === ownerAuthorName}
                        isAuthor={currentUserId !== null && reply.authorUserId === currentUserId}
                        isReplying={false}
                        onReply={() => setReplyingTo(node.comment.id)}
                        onDelete={() => deleteComment(reply.id)}
                        onCopyLink={() => copyLink(reply.id)}
                        deleting={pendingDelete === reply.id}
                      />
                    </div>
                  ))}

                  {replyingTo === node.comment.id && (
                    <Composer
                      fnId={fnId}
                      signedIn={signedIn}
                      currentUserName={currentUserName}
                      currentUserImage={currentUserImage}
                      compact
                      replyTo={node.comment.authorName}
                      autoFocus
                      onCancel={() => setReplyingTo(null)}
                      onSubmit={async (body) => {
                        const ok = await postComment(body, node.comment.id);
                        if (ok) setReplyingTo(null);
                        return ok;
                      }}
                    />
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isPending ? <p className="text-[var(--color-bone-faint)] text-xs">Working…</p> : null}
    </div>
  );
}

function CommentCard({
  comment,
  isReply = false,
  isOwner,
  isAuthor,
  isReplying,
  onReply,
  onDelete,
  onCopyLink,
  deleting,
}: {
  comment: ThreadComment;
  isReply?: boolean;
  isOwner: boolean;
  isAuthor: boolean;
  isReplying: boolean;
  onReply: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  deleting: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <article
      className={`group relative rounded-2xl border bg-[var(--color-ink-elevated)]/55 p-5 transition ${
        comment.pending
          ? "animate-pulse border-[var(--color-amber)]/30 bg-[var(--color-amber)]/[0.04]"
          : "border-[var(--color-border)] hover:border-[var(--color-border-muted)] hover:bg-[var(--color-ink-elevated)]/75"
      }`}
    >
      <div className="flex gap-3 sm:gap-4">
        <Avatar
          name={comment.authorName || "Anonymous"}
          image={comment.authorImage}
          size={isReply ? 32 : 40}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-[var(--color-bone)] text-sm">
              {comment.authorName || "Anonymous"}
            </span>
            {isOwner ? (
              <span className="rounded-full border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/10 px-2 py-0.5 font-medium text-[10px] text-[var(--color-amber)] uppercase tracking-wider">
                Author
              </span>
            ) : null}
            <span className="text-[var(--color-bone-faint)] text-xs">·</span>
            <RelativeTime value={comment.createdAt} />
            {comment.pending ? (
              <span className="inline-flex items-center gap-1 text-[var(--color-amber)] text-xs">
                <Loader2 className="size-3 animate-spin" />
                Posting
              </span>
            ) : null}
          </div>

          <div className="mt-2 whitespace-pre-wrap break-words text-[var(--color-bone-muted)] text-sm leading-relaxed">
            {comment.body}
          </div>

          <div className="mt-3 flex items-center gap-1 text-[var(--color-bone-faint)] opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
            {!isReply ? (
              <button
                type="button"
                onClick={onReply}
                className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:bg-white/[0.05] hover:text-[var(--color-bone)] ${
                  isReplying ? "bg-white/[0.06] text-[var(--color-bone)]" : ""
                }`}
              >
                <CornerDownRight className="size-3.5" />
                Reply
              </button>
            ) : null}
            <button
              type="button"
              onClick={onCopyLink}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs transition hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
            >
              <Link2 className="size-3.5" />
              Copy link
            </button>
            {isAuthor && !comment.pending ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label="More actions"
                  className="inline-flex items-center rounded-full px-2 py-1 transition hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-ink-elevated)] shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setConfirming(true);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-300 text-xs transition hover:bg-red-500/10"
                    >
                      <Trash2 className="size-3.5" />
                      Delete comment
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {confirming ? (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] p-3">
              <p className="text-red-200 text-xs">Delete this comment? This can't be undone.</p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 rounded-full px-3 text-[var(--color-bone-muted)] text-xs hover:text-[var(--color-bone)]"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 rounded-full bg-red-500/90 px-3 text-white text-xs hover:bg-red-500"
                  onClick={() => {
                    setConfirming(false);
                    onDelete();
                  }}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="size-3 animate-spin" /> : null}
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function Composer({
  fnId,
  signedIn,
  currentUserName,
  currentUserImage,
  onSubmit,
  onCancel,
  compact = false,
  replyTo,
  autoFocus = false,
}: {
  fnId: string;
  signedIn: boolean;
  currentUserName: string | null;
  currentUserImage: string | null;
  onSubmit: (body: string) => Promise<boolean> | boolean;
  onCancel?: () => void;
  compact?: boolean;
  replyTo?: string | null;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus]);

  const trimmed = body.trim();
  const canSubmit = signedIn && trimmed.length >= MIN_COMMENT_LENGTH && !submitting;
  const charCount = body.length;
  const overLimit = charCount > MAX_COMMENT_LENGTH;
  const counterClass =
    charCount > MAX_COMMENT_LENGTH * 0.95
      ? "text-red-400"
      : charCount > MAX_COMMENT_LENGTH * 0.8
        ? "text-[var(--color-amber)]"
        : "text-[var(--color-bone-faint)]";

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(`/marketplace/${fnId}`)}`);
      return;
    }
    if (!canSubmit || overLimit) return;
    setSubmitting(true);
    try {
      const ok = await onSubmit(body);
      if (ok) setBody("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      void submit();
    } else if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      onCancel();
    }
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-[var(--color-border)] border-dashed bg-black/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-[var(--color-bone)] text-sm">Join the discussion</p>
          <p className="mt-1 text-[var(--color-bone-muted)] text-xs">
            Sign in to comment, reply, and star functions you love.
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-full bg-[var(--color-amber)] px-5 text-[var(--color-ink)] hover:bg-[var(--color-amber-hover)]"
          onClick={() => router.push(`/login?next=${encodeURIComponent(`/marketplace/${fnId}`)}`)}
        >
          Sign in to comment
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className={`rounded-2xl border bg-[var(--color-ink-elevated)]/55 p-4 transition focus-within:border-[var(--color-amber)]/45 focus-within:bg-[var(--color-ink-elevated)]/80 ${
        compact ? "border-[var(--color-border-muted)]" : "border-[var(--color-border)]"
      }`}
    >
      {replyTo ? (
        <div className="mb-3 flex items-center justify-between gap-2 text-[var(--color-bone-faint)] text-xs">
          <span className="inline-flex items-center gap-1.5">
            <CornerDownRight className="size-3.5" />
            Replying to <strong className="text-[var(--color-bone-muted)]">{replyTo}</strong>
          </span>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full px-2 py-0.5 transition hover:bg-white/[0.05] hover:text-[var(--color-bone)]"
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex gap-3">
        <Avatar name={currentUserName ?? "You"} image={currentUserImage} size={compact ? 32 : 36} />
        <div className="min-w-0 flex-1">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(event) => {
              setBody(event.target.value);
              autoSize(event.currentTarget);
            }}
            onKeyDown={handleKeyDown}
            placeholder={replyTo ? `Reply to ${replyTo}…` : "Share a use case, question, or idea…"}
            rows={compact ? 2 : 3}
            maxLength={MAX_COMMENT_LENGTH + 200}
            className="w-full resize-none border-0 bg-transparent text-[var(--color-bone)] text-sm leading-relaxed outline-none placeholder:text-[var(--color-bone-faint)]"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-[var(--color-bone-faint)] text-xs">
              <span className={counterClass}>
                {charCount} / {MAX_COMMENT_LENGTH}
              </span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <kbd className="rounded border border-[var(--color-border)] bg-black/30 px-1 font-mono text-[10px]">
                  ⌘
                </kbd>
                <kbd className="rounded border border-[var(--color-border)] bg-black/30 px-1 font-mono text-[10px]">
                  Enter
                </kbd>
                <span>to post</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onCancel ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-full text-[var(--color-bone-muted)] text-xs hover:text-[var(--color-bone)]"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              ) : null}
              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit || overLimit}
                className="h-9 rounded-full bg-[var(--color-amber)] px-4 font-medium text-[var(--color-ink)] text-xs hover:bg-[var(--color-amber-hover)] disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
                {replyTo ? "Reply" : "Comment"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
