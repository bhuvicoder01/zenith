"use client";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCheck,
  ChevronRight,
  Compass,
  Download,
  FileText,
  LayoutGrid,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import ZenithBrand from "@/components/ZenithBrand";
import {
  demoJobs,
  demoSkills,
  initialSkills,
  demoMatchScore,
  demoCoverNote,
  type DemoJob,
  type DemoStatus,
} from "@/lib/demo";

type Section = "profile" | "matches" | "documents" | "tracker";
type DemoApplication = {
  jobId: string;
  status: DemoStatus;
  document: string;
  appliedAt?: string;
};
const sections = [
  { id: "profile", label: "Your profile", icon: UserRound },
  { id: "matches", label: "Discover roles", icon: Compass },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "tracker", label: "Application tracker", icon: LayoutGrid },
] as const;
export default function DemoPage() {
  const [section, setSection] = useState<Section>("matches");
  const [skills, setSkills] = useState(initialSkills);
  const [role, setRole] = useState("Full-stack Developer");
  const [query, setQuery] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedId, setSelectedId] = useState(demoJobs[0].id);
  const [applications, setApplications] = useState<DemoApplication[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const resetTrigger = useRef<HTMLButtonElement | null>(null);
  const openReset = (event: MouseEvent<HTMLButtonElement>) => {
    resetTrigger.current = event.currentTarget;
    setResetOpen(true);
  };
  const roleDetail = useRef<HTMLElement>(null);
  const selectJob = (id: string) => {
    setSelectedId(id);
    if (window.innerWidth < 960)
      requestAnimationFrame(() => {
        roleDetail.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "auto"
            : "smooth",
          block: "start",
        });
        roleDetail.current?.focus({ preventScroll: true });
      });
  };
  const selectedJob = demoJobs.find((job) => job.id === selectedId)!;
  const selectedApplication = applications.find(
    (app) => app.jobId === selectedId,
  );
  const visibleJobs = useMemo(
    () =>
      demoJobs
        .filter(
          (job) =>
            (!remoteOnly || job.remote) &&
            `${job.title} ${job.company} ${job.skills.join(" ")}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort(
          (a, b) =>
            demoMatchScore(skills, b.skills) - demoMatchScore(skills, a.skills),
        ),
    [skills, query, remoteOnly],
  );
  const saveJob = (job: DemoJob) => {
    if (!applications.some((app) => app.jobId === job.id))
      setApplications((previous) => [
        ...previous,
        { jobId: job.id, status: "SAVED", document: "" },
      ]);
    setAnnouncement(`${job.title} saved in this demo.`);
  };
  const prepare = (job: DemoJob) => {
    setApplications((previous) => {
      const existing = previous.find((app) => app.jobId === job.id);
      return existing
        ? previous.map((app) =>
            app.jobId === job.id
              ? {
                  ...app,
                  document: app.document || demoCoverNote(job, skills, role),
                }
              : app,
          )
        : [
            ...previous,
            {
              jobId: job.id,
              status: "SAVED",
              document: demoCoverNote(job, skills, role),
            },
          ];
    });
    setSelectedId(job.id);
    setSection("documents");
    setAnnouncement(
      "Sample draft prepared locally. Application status unchanged.",
    );
  };
  const changeStatus = (jobId: string, status: DemoStatus) => {
    setApplications((previous) =>
      previous.map((app) =>
        app.jobId === jobId
          ? {
              ...app,
              status,
              appliedAt:
                status === "APPLIED"
                  ? app.appliedAt || new Date().toISOString()
                  : app.appliedAt,
            }
          : app,
      ),
    );
    setAnnouncement(
      `Demo status changed to ${status.toLowerCase()}. Nothing was submitted.`,
    );
  };
  const download = () => {
    if (!selectedApplication?.document) return;
    const url = URL.createObjectURL(
      new Blob([selectedApplication.document], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `zenith-fictional-${selectedId}-cover-note.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const reset = () => {
    setApplications([]);
    setSkills(initialSkills);
    setRole("Full-stack Developer");
    setQuery("");
    setRemoteOnly(false);
    setSelectedId(demoJobs[0].id);
    setSection("matches");
    setResetOpen(false);
    setAnnouncement("Demo reset to its original fictional data.");
  };
  const jobMark = (job: DemoJob) => (
    <span
      className={`z-company-icon z-company-${job.color}`}
      aria-hidden="true"
    >
      {job.initial}
    </span>
  );
  return (
    <div className="z-product z-demo">
      <a href="#demo-main" className="z-skip-link">
        Skip to workspace
      </a>
      <div className="z-demo-banner">
        <span>
          <span className="z-status-dot" /> Interactive demo{" "}
          <span className="z-banner-divider">/</span> Fictional people & roles.
          Changes stay in this tab.
        </span>
        <Link href="/auth/register">
          Create your own workspace <ArrowUpRight size={14} />
        </Link>
      </div>
      <aside className="z-demo-sidebar">
        <ZenithBrand />
        <span className="z-sidebar-label">CAREER WORKSPACE</span>
        <nav aria-label="Demo workflow">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              className={section === item.id ? "is-active" : ""}
              aria-current={section === item.id ? "page" : undefined}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "tracker" && applications.length > 0 && (
                <span className="z-nav-count">{applications.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="z-sidebar-tip">
          <Sparkles size={20} />
          <strong>Take the scenic route.</strong>
          <p>
            Try changing the profile skills to see the sample matches respond.
          </p>
          <button onClick={() => setSection("profile")}>
            Explore your profile <ArrowRight size={15} />
          </button>
        </div>
        <button className="z-demo-reset" onClick={openReset}>
          <RotateCcw size={16} /> Reset demo
        </button>
        <div className="z-sidebar-person">
          <span className="z-avatar">AS</span>
          <div>
            <strong>Alex Shah</strong>
            <span>Fictional demo profile</span>
          </div>
        </div>
      </aside>
      <div className="z-demo-content">
        <header className="z-demo-topbar">
          <div>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {sections.find((item) => item.id === section)?.label}
            </strong>
          </div>
          <Link href="/" className="z-demo-exit">
            Back to Zenith <ArrowUpRight size={15} />
          </Link>
        </header>
        <nav className="z-demo-mobile-nav" aria-label="Demo sections">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? "page" : undefined}
              className={section === item.id ? "is-active" : ""}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <main id="demo-main" className="z-demo-main">
          <div className="z-demo-heading">
            <div>
              <span className="z-eyebrow">A LITTLE MOMENTUM, EVERY DAY</span>
              <h1>
                {section === "matches"
                  ? "Your next move, in focus."
                  : section === "profile"
                    ? "Start with what makes you, you."
                    : section === "documents"
                      ? "A draft. Your voice. Your next step."
                      : "See the whole picture."}
              </h1>
              <p>
                {section === "matches"
                  ? "A few relevant directions. Room to choose your own."
                  : section === "profile"
                    ? "Shape this fictional profile and watch the matches change."
                    : section === "documents"
                      ? "Review and edit a local sample before recording any next step."
                      : "Keep track of the opportunities that matter to you."}
              </p>
            </div>
            <span className="z-avatar z-heading-avatar">AS</span>
          </div>
          <div className="z-demo-summary">
            <div>
              <span className="z-summary-icon">
                <Compass size={19} />
              </span>
              <div>
                <strong>{demoJobs.length}</strong>
                <span>Sample opportunities</span>
              </div>
            </div>
            <div>
              <span className="z-summary-icon">
                <Bookmark size={18} />
              </span>
              <div>
                <strong>{applications.length}</strong>
                <span>In your tracker</span>
              </div>
            </div>
            <div>
              <span className="z-summary-icon">
                <FileText size={18} />
              </span>
              <div>
                <strong>
                  {applications.filter((app) => app.document).length}
                </strong>
                <span>Drafts prepared</span>
              </div>
            </div>
            <div className="z-summary-tip">
              <span className="z-status-dot" /> Progress, at your pace.
            </div>
          </div>
          {section === "profile" && (
            <div className="z-demo-two-column">
              <section className="z-panel">
                <div className="z-panel-heading">
                  <div>
                    <span className="z-eyebrow">01 / YOUR STARTING POINT</span>
                    <h2>A profile with direction</h2>
                  </div>
                  <UserRound size={21} />
                </div>
                <div className="z-profile-intro">
                  <span className="z-avatar z-avatar-large">AS</span>
                  <div>
                    <h3>Alex Shah</h3>
                    <p>Fictional candidate · India · Open to remote roles</p>
                  </div>
                </div>
                <label className="z-field-label" htmlFor="target-role">
                  Target role
                </label>
                <input
                  id="target-role"
                  maxLength={80}
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="z-input"
                />
                <fieldset className="z-skill-fieldset">
                  <legend>Skills in this sample profile</legend>
                  <p>
                    Select the skills you want to explore. Scores update
                    immediately.
                  </p>
                  <div className="z-selectable-skills">
                    {demoSkills.map((skill) => (
                      <button
                        type="button"
                        key={skill}
                        aria-pressed={skills.includes(skill)}
                        className={skills.includes(skill) ? "is-selected" : ""}
                        onClick={() =>
                          setSkills((previous) =>
                            previous.includes(skill)
                              ? previous.filter((item) => item !== skill)
                              : [...previous, skill],
                          )
                        }
                      >
                        {skills.includes(skill) && <Check size={14} />}
                        {skill}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <button
                  className="z-button z-button-dark"
                  onClick={() => setSection("matches")}
                >
                  Explore my sample matches <ArrowRight size={17} />
                </button>
              </section>
              <aside className="z-panel z-soft-panel">
                <span className="z-eyebrow">KNOW WHAT YOU&apos;RE SEEING</span>
                <h2>Transparent by design.</h2>
                <p>
                  In this demo, the score is the share of a role&apos;s listed
                  skills that appear in the profile.
                </p>
                <div className="z-formula">
                  Matching skills ÷ listed skills × 100
                </div>
                <p>
                  It is an illustrative relevance signal, not a hiring
                  prediction. Real roles need a closer look at responsibilities,
                  experience, and your own priorities.
                </p>
                <div className="z-inline-note">
                  <ShieldCheck size={18} />
                  <span>
                    Everything here is fictional. No resume is uploaded or
                    parsed.
                  </span>
                </div>
              </aside>
            </div>
          )}
          {section === "matches" && (
            <>
              <div className="z-discovery-toolbar">
                <div className="z-search-field">
                  <Search size={18} />
                  <input
                    aria-label="Search sample roles"
                    placeholder="Search a role, company, or skill"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      aria-label="Clear search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <button
                  className={`z-filter-button ${remoteOnly ? "is-active" : ""}`}
                  onClick={() => setRemoteOnly(!remoteOnly)}
                  aria-pressed={remoteOnly}
                >
                  <SlidersHorizontal size={16} /> Remote only
                </button>
              </div>
              <div className="z-discovery-layout">
                <section
                  className="z-job-list"
                  aria-label="Sample opportunities"
                >
                  <div className="z-list-heading">
                    <h2>Selected for your profile</h2>
                    <span>{visibleJobs.length} sample roles</span>
                  </div>
                  {visibleJobs.length === 0 ? (
                    <div className="z-empty-state">
                      <Search size={28} />
                      <h3>No sample roles found</h3>
                      <p>Try another skill or clear the filters.</p>
                      <button
                        className="z-button z-button-outline"
                        onClick={() => {
                          setQuery("");
                          setRemoteOnly(false);
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    visibleJobs.map((job) => {
                      const score = demoMatchScore(skills, job.skills);
                      const isSaved = applications.some(
                        (app) => app.jobId === job.id,
                      );
                      return (
                        <article
                          key={job.id}
                          className={`z-job-card ${selectedId === job.id ? "is-selected" : ""}`}
                        >
                          <div className="z-job-card-top">
                            {jobMark(job)}
                            <div>
                              <span>{job.company}</span>
                              <span className="z-job-sample-label">
                                Sample company
                              </span>
                            </div>
                            <button
                              className={`z-save-button ${isSaved ? "is-saved" : ""}`}
                              onClick={() => saveJob(job)}
                              disabled={isSaved}
                              aria-label={
                                isSaved
                                  ? `${job.title} already saved`
                                  : `Save ${job.title}`
                              }
                            >
                              {isSaved ? (
                                <CheckCheck size={18} />
                              ) : (
                                <Bookmark size={18} />
                              )}
                            </button>
                          </div>
                          <button
                            className="z-job-select"
                            onClick={() => selectJob(job.id)}
                            aria-pressed={selectedId === job.id}
                          >
                            <h3>{job.title}</h3>
                            <p>
                              <MapPin size={13} />
                              {job.location}
                            </p>
                            <div className="z-tag-row">
                              {job.skills.slice(0, 3).map((skill) => (
                                <span key={skill}>{skill}</span>
                              ))}
                              {job.skills.length > 3 && (
                                <span>+{job.skills.length - 3}</span>
                              )}
                            </div>
                          </button>
                          <div className="z-job-card-bottom">
                            <span className="z-match-label">
                              <span className="z-status-dot" /> {score}
                              <small>/100 skill overlap</small>
                            </span>
                            <button
                              onClick={() => selectJob(job.id)}
                              aria-label={`View ${job.title} details`}
                            >
                              View role <ArrowUpRight size={15} />
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </section>
                <aside
                  ref={roleDetail}
                  tabIndex={-1}
                  aria-label="Selected sample role"
                  className="z-role-detail z-panel"
                >
                  <div className="z-role-detail-top">
                    {jobMark(selectedJob)}
                    <span className="z-pill">Fictional opportunity</span>
                  </div>
                  <p className="z-detail-company">{selectedJob.company}</p>
                  <h2>{selectedJob.title}</h2>
                  <p className="z-detail-location">
                    <MapPin size={15} />
                    {selectedJob.location}
                  </p>
                  <div className="z-score-explainer">
                    <div>
                      <Sparkles size={17} />
                      <strong>Why this direction?</strong>
                      <span>
                        {demoMatchScore(skills, selectedJob.skills)}
                        <small>/100</small>
                      </span>
                    </div>
                    <p>
                      {
                        selectedJob.skills.filter((skill) =>
                          skills.includes(skill),
                        ).length
                      }{" "}
                      of {selectedJob.skills.length} listed skills overlap. This
                      is a demo heuristic, not a hiring probability.
                    </p>
                    <div className="z-score-track">
                      <span
                        style={{
                          width: `${demoMatchScore(skills, selectedJob.skills)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="z-role-description">
                    <h3>The opportunity</h3>
                    <p>{selectedJob.description}</p>
                    <h3>What you could work on</h3>
                    <ul>
                      {selectedJob.responsibilities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <h3>Your skill overlap</h3>
                    <div className="z-tag-row">
                      {selectedJob.skills.map((skill) => (
                        <span
                          className={
                            skills.includes(skill) ? "z-tag-matched" : ""
                          }
                          key={skill}
                        >
                          {skills.includes(skill) && <Check size={12} />}
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="z-button z-button-dark z-full-width"
                    onClick={() => prepare(selectedJob)}
                  >
                    Prepare a sample draft <ArrowRight size={17} />
                  </button>
                  <p className="z-detail-footnote">
                    Local template only. Nothing is submitted.
                  </p>
                </aside>
              </div>
            </>
          )}
          {section === "documents" && (
            <>
              {applications.some((app) => app.document) ? (
                <div className="z-documents-layout">
                  <aside className="z-panel z-document-list">
                    <span className="z-eyebrow">YOUR LOCAL DRAFTS</span>
                    {applications
                      .filter((app) => app.document)
                      .map((app) => {
                        const job = demoJobs.find(
                          (item) => item.id === app.jobId,
                        )!;
                        return (
                          <button
                            key={app.jobId}
                            className={
                              app.jobId === selectedId ? "is-active" : ""
                            }
                            onClick={() => setSelectedId(app.jobId)}
                          >
                            <FileText size={18} />
                            <span>
                              <strong>{job.company}</strong>
                              <small>Sample cover note</small>
                            </span>
                            <ChevronRight size={14} />
                          </button>
                        );
                      })}
                    <div className="z-inline-note">
                      <ShieldCheck size={18} />
                      <span>
                        Preparing a document keeps an opportunity saved. You
                        choose when its status changes.
                      </span>
                    </div>
                  </aside>
                  <section className="z-panel z-document-editor">
                    <div className="z-panel-heading">
                      <div>
                        <span className="z-eyebrow">
                          FICTIONAL SAMPLE / EDITABLE
                        </span>
                        <h2>
                          {selectedApplication?.document
                            ? `${selectedJob.company} — cover note`
                            : "Choose a draft"}
                        </h2>
                      </div>
                      {selectedApplication?.document && (
                        <button
                          className="z-icon-button"
                          onClick={download}
                          aria-label="Download fictional cover note"
                        >
                          <Download size={19} />
                        </button>
                      )}
                    </div>
                    {selectedApplication?.document ? (
                      <>
                        <label
                          className="z-field-label"
                          htmlFor="sample-document"
                        >
                          Review and edit your sample draft
                        </label>
                        <textarea
                          id="sample-document"
                          className="z-document-textarea"
                          value={selectedApplication.document}
                          onChange={(event) =>
                            setApplications((previous) =>
                              previous.map((app) =>
                                app.jobId === selectedId
                                  ? { ...app, document: event.target.value }
                                  : app,
                              ),
                            )
                          }
                        />
                        <div className="z-document-actions">
                          <span>
                            <Check size={14} /> Changes stay in this tab
                          </span>
                          <button
                            className="z-button z-button-dark"
                            onClick={() => setSection("tracker")}
                          >
                            View in tracker <ArrowRight size={16} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <p>Select a prepared document from the list.</p>
                    )}
                  </section>
                </div>
              ) : (
                <div className="z-empty-state z-panel">
                  <FileText size={32} />
                  <h2>Your first draft starts with a role.</h2>
                  <p>
                    Choose a sample opportunity to prepare an editable cover
                    note.
                  </p>
                  <button
                    className="z-button z-button-dark"
                    onClick={() => setSection("matches")}
                  >
                    Explore sample roles <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
          {section === "tracker" && (
            <section className="z-panel z-tracker">
              <div className="z-panel-heading">
                <div>
                  <span className="z-eyebrow">
                    ONE PLACE FOR YOUR NEXT STEPS
                  </span>
                  <h2>Application tracker</h2>
                </div>
                <button
                  className="z-button z-button-outline z-button-small"
                  onClick={() => setSection("matches")}
                >
                  Discover roles <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="z-inline-note">
                <ShieldCheck size={18} />
                <span>
                  Status changes are local demo records. No application, email,
                  or message is sent.
                </span>
              </div>
              {applications.length ? (
                applications.map((app) => {
                  const job = demoJobs.find((item) => item.id === app.jobId)!;
                  return (
                    <article className="z-tracker-row" key={app.jobId}>
                      {jobMark(job)}
                      <div className="z-tracker-job">
                        <h3>{job.title}</h3>
                        <p>
                          {job.company} ·{" "}
                          {app.document ? "Draft ready" : "No draft yet"}
                        </p>
                        {app.appliedAt && (
                          <small>
                            Recorded as applied:{" "}
                            {new Date(app.appliedAt).toLocaleDateString()}
                          </small>
                        )}
                      </div>
                      <label className="z-tracker-status">
                        <span>Status for {job.company}</span>
                        <select
                          value={app.status}
                          onChange={(event) =>
                            changeStatus(
                              app.jobId,
                              event.target.value as DemoStatus,
                            )
                          }
                        >
                          <option value="SAVED">Saved</option>
                          <option value="APPLIED">Applied</option>
                          <option value="INTERVIEW">Interview</option>
                          <option value="OFFER">Offer</option>
                          <option value="ARCHIVED">Archived</option>
                        </select>
                      </label>
                      <button
                        className="z-icon-button"
                        aria-label={`${app.document ? "Review" : "Prepare"} draft for ${job.company}`}
                        onClick={() => prepare(job)}
                      >
                        <FileText size={18} />
                      </button>
                    </article>
                  );
                })
              ) : (
                <div className="z-empty-state">
                  <Bookmark size={30} />
                  <h3>Make room for an opportunity.</h3>
                  <p>Save a role or prepare a draft to begin your tracker.</p>
                  <button
                    className="z-button z-button-dark"
                    onClick={() => setSection("matches")}
                  >
                    Discover sample roles <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer className="z-demo-bottom">
            <span>
              <ShieldCheck size={14} /> Fictional demo · no external actions
            </span>
            <button onClick={openReset}>
              Reset this workspace <RotateCcw size={13} />
            </button>
          </footer>
          <div className="z-announcement" role="status" aria-live="polite">
            {announcement}
          </div>
        </main>
      </div>
      <Dialog.Root open={resetOpen} onOpenChange={setResetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="z-reset-overlay" />
          <Dialog.Content
            className="z-confirm-dialog z-reset-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              resetTrigger.current?.focus();
            }}
          >
            <RotateCcw size={25} />
            <Dialog.Title>Start fresh?</Dialog.Title>
            <Dialog.Description>
              This clears your sample drafts, saved roles, and profile edits in
              this tab.
            </Dialog.Description>
            <div>
              <Dialog.Close asChild>
                <button className="z-button z-button-outline">
                  Keep exploring
                </button>
              </Dialog.Close>
              <button className="z-button z-button-dark" onClick={reset}>
                Reset demo
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
