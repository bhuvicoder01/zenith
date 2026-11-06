"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  hasPreparedDocuments,
  formatAppliedDate,
} from "@/lib/applicationState";
import { useWebSocketStore } from "@/store/useWebSocketStore";
type Status =
  | "SAVED"
  | "APPLIED"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED"
  | "ARCHIVED";
interface Application {
  id: string;
  jobId?: string;
  jobTitle: string;
  company: string;
  status: Status;
  appliedDate?: string | null;
  tailoredResumeS3Url?: string;
  coverLetterText?: string;
  emailIntroduction?: string;
  interviewPrepText?: string;
  templateStyle?: string;
}
const statusLabels: Record<Status, string> = {
  SAVED: "Saved",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Closed · rejected",
  ARCHIVED: "Archived",
};
export default function ApplicationTracker() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [query, setQuery] = useState("");
  const { prepStatus } = useWebSocketStore();
  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await api.get("/applications");
      setApps(Array.isArray(response.data) ? response.data : []);
    } catch {
      setError(
        "Your applications could not be loaded. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (prepStatus?.step === "COMPLETED" || prepStatus?.step === "FAILED")
      refresh();
  }, [prepStatus?.step, refresh]);
  const update = async (id: string, status: Status) => {
    setBusyId(id);
    try {
      await api.patch(`/applications/${id}/status`, null, {
        params: { status },
      });
      await refresh();
      toast.success(`Status updated to ${statusLabels[status].toLowerCase()}.`);
    } catch {
      toast.error("The status could not be updated. Please try again.");
    } finally {
      setBusyId(null);
    }
  };
  const prepare = async (id: string) => {
    setGeneratingId(id);
    try {
      await api.post(`/applications/${id}/prepare`);
      await refresh();
      toast.success(
        "Your documents are ready to review. Application status is unchanged.",
      );
    } catch {
      toast.error(
        "Document preparation could not finish. Your application is still in the tracker.",
      );
      await refresh();
    } finally {
      setGeneratingId(null);
    }
  };
  const remove = async (id: string) => {
    if (
      !window.confirm(
        "Delete this application and its generated documents? This cannot be undone.",
      )
    )
      return;
    setBusyId(id);
    try {
      await api.delete(`/applications/${id}`);
      await refresh();
      toast.success("Application deleted.");
    } catch {
      toast.error("The application could not be deleted.");
    } finally {
      setBusyId(null);
    }
  };
  const filtered = apps.filter(
    (app) =>
      (archived ? app.status === "ARCHIVED" : app.status !== "ARCHIVED") &&
      `${app.jobTitle} ${app.company}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  if (loading)
    return (
      <div
        className="min-h-[50vh] flex items-center justify-center gap-3 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 size={20} className="animate-spin" />
        Loading your application tracker…
      </div>
    );
  if (error)
    return (
      <div className="z-error-state" role="alert">
        <h1 className="text-xl">Let&apos;s try that again.</h1>
        <p>{error}</p>
        <button className="z-button z-button-dark" onClick={refresh}>
          <RotateCcw size={16} />
          Retry
        </button>
      </div>
    );
  return (
    <div className="space-y-7">
      <header className="flex flex-wrap justify-between gap-5 items-start">
        <div>
          <span className="text-[10px] tracking-widest text-muted-foreground">
            YOUR NEXT CHAPTER
          </span>
          <h1 className="text-3xl md:text-4xl mt-3">
            Every opportunity, in one place.
          </h1>
          <p className="text-sm text-muted-foreground mt-3 max-w-xl">
            Prepare thoughtfully. Keep track of your next steps. You decide when
            an application moves forward.
          </p>
        </div>
        <Link href="/dashboard/jobs" className="z-button z-button-dark">
          <Plus size={16} />
          Discover roles
        </Link>
      </header>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          [
            { status: "SAVED", label: "Saved opportunities", icon: Bookmark },
            {
              status: "APPLIED",
              label: "Recorded as applied",
              icon: ArrowUpRight,
            },
            { status: "INTERVIEW", label: "At interview", icon: CheckCircle2 },
            { status: "OFFER", label: "Offers", icon: FileText },
          ] as const
        ).map((item) => (
          <div
            key={item.status}
            className="bg-card border border-border rounded-xl p-5 flex items-center gap-4"
          >
            <span className="p-2.5 bg-accent rounded-lg text-accent-foreground">
              <item.icon size={18} />
            </span>
            <div>
              <strong className="text-2xl font-medium">
                {apps.filter((app) => app.status === item.status).length}
              </strong>
              <p className="text-[10px] text-muted-foreground mt-1">
                {item.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-3 border border-border bg-accent/35 rounded-lg p-4 items-start text-xs text-muted-foreground">
        <ShieldCheck size={17} className="shrink-0 mt-0.5" />
        <p>
          Preparing documents does not submit an application. Record{" "}
          <strong className="text-foreground font-medium">Applied</strong> after
          you submit it through the employer&apos;s own process.
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-between">
        <div className="inline-flex p-1 rounded-lg bg-secondary border border-border">
          {[false, true].map((value) => (
            <button
              key={String(value)}
              onClick={() => setArchived(value)}
              aria-pressed={archived === value}
              className={`text-xs px-5 py-2 rounded-md ${archived === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
            >
              {value ? "Archived" : "Active"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 bg-card border border-border rounded-lg px-3">
          <Search size={16} className="text-muted-foreground" />
          <input
            aria-label="Search applications"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a role or company"
            className="bg-transparent py-3 text-xs outline-none w-48"
          />
        </label>
      </div>
      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((app) => {
            const ready = hasPreparedDocuments(app);
            const generating =
              generatingId === app.id ||
              app.tailoredResumeS3Url === "preparing" ||
              (prepStatus?.applicationId === app.id &&
                prepStatus.step !== "FAILED" &&
                prepStatus.step !== "COMPLETED");
            return (
              <article
                key={app.id}
                className="bg-card border border-border rounded-xl p-5 md:p-6"
              >
                <div className="flex flex-wrap gap-5 items-center">
                  <div className="w-11 h-11 rounded-lg bg-accent text-accent-foreground flex items-center justify-center font-display text-xl">
                    {app.company?.[0] || "J"}
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <h2 className="text-lg">{app.jobTitle}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {app.company}
                      {app.templateStyle
                        ? ` · ${app.templateStyle.toLowerCase()} template`
                        : ""}
                    </p>
                  </div>
                  <label className="text-[10px] text-muted-foreground flex flex-col gap-1.5">
                    <span>Status for {app.company}</span>
                    <select
                      aria-label={`Application status for ${app.jobTitle} at ${app.company}`}
                      value={app.status}
                      disabled={busyId === app.id}
                      onChange={(event) =>
                        update(app.id, event.target.value as Status)
                      }
                      className="text-xs text-foreground border border-border bg-background rounded-lg py-2.5 px-3"
                    >
                      {Object.entries(statusLabels).map(([status, label]) => (
                        <option value={status} key={status}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-5 pt-4 border-t border-border flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground">
                    <span>{formatAppliedDate(app.appliedDate)}</span>
                    <span className="flex items-center gap-1.5">
                      {generating ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <FileText size={13} />
                      )}{" "}
                      {generating
                        ? "Preparing documents"
                        : ready
                          ? "Documents ready to review"
                          : "Documents not yet prepared"}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2">
                    {ready ? (
                      <Link
                        className="inline-flex gap-1 items-center text-xs px-3 py-2 rounded-lg border border-border"
                        href={`/dashboard/applications/${app.id}/prep`}
                      >
                        Review documents
                        <ChevronRight size={14} />
                      </Link>
                    ) : (
                      <button
                        onClick={() => prepare(app.id)}
                        disabled={Boolean(generating) || generatingId !== null}
                        className="text-xs px-3 py-2 rounded-lg border border-border disabled:opacity-50"
                      >
                        {generating ? "Preparing…" : "Prepare documents"}
                      </button>
                    )}
                    {!archived && (
                      <button
                        onClick={() => update(app.id, "ARCHIVED")}
                        disabled={busyId === app.id}
                        className="p-2 text-muted-foreground"
                        aria-label={`Archive ${app.jobTitle}`}
                      >
                        <Archive size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => remove(app.id)}
                      disabled={busyId === app.id}
                      className="p-2 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${app.jobTitle}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="z-error-state">
            <Bookmark
              size={29}
              className="mx-auto text-muted-foreground mb-4"
            />
            <h2 className="text-xl">
              {query
                ? "No matching applications"
                : archived
                  ? "No archived applications"
                  : "A fresh page for your next step."}
            </h2>
            <p>
              {query
                ? "Try another search or clear the field."
                : archived
                  ? "Applications you archive will appear here."
                  : "Choose a role to save it and begin preparing your documents."}
            </p>
            {query ? (
              <button
                className="z-button z-button-outline"
                onClick={() => setQuery("")}
              >
                Clear search
              </button>
            ) : (
              !archived && (
                <Link className="z-button z-button-dark" href="/dashboard/jobs">
                  Discover roles
                  <ArrowUpRight size={16} />
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
