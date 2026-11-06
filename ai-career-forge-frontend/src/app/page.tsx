import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  FileText,
  Layers3,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import ProductNav from "@/components/ProductNav";
import ZenithBrand from "@/components/ZenithBrand";
export const metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Zenith — Your next chapter, a clearer path",
    description:
      "A thoughtful career workspace. Explore roles, prepare documents, and track your next steps.",
    url: "/",
    type: "website",
  },
};
export default function Home() {
  return (
    <div className="z-product">
      <a href="#main-content" className="z-skip-link">
        Skip to content
      </a>
      <ProductNav />
      <main id="main-content">
        <section className="z-container z-hero">
          <div className="z-hero-copy">
            <span className="z-eyebrow">
              <span className="z-status-dot" /> A little clarity. A better next
              move.
            </span>
            <h1>
              Your next chapter.
              <br />
              <span>A clearer path.</span>
            </h1>
            <p className="z-hero-description">
              Bring your experience, discover relevant roles, and prepare
              thoughtful applications. One calm workspace for the work of
              finding your next opportunity.
            </p>
            <div className="z-hero-actions">
              <Link href="/auth/register" className="z-button z-button-dark">
                Build your career workspace <ArrowUpRight size={18} />
              </Link>
              <Link href="/demo" className="z-text-link">
                Take a look inside <ArrowRight size={17} />
              </Link>
            </div>
            <div className="z-hero-note">
              <ShieldCheck size={16} /> You stay in control of every
              application.
            </div>
          </div>
          <div
            className="z-preview"
            aria-label="Illustrative career workspace preview with fictional sample data"
          >
            <div className="z-preview-top">
              <span className="z-preview-logo">
                <Layers3 size={15} /> Your workspace
              </span>
              <span className="z-pill">Illustrative preview</span>
            </div>
            <div className="z-preview-body">
              <div className="z-preview-heading">
                <div>
                  <span className="z-eyebrow">NEXT CHAPTER</span>
                  <h2>
                    Make your experience
                    <br />
                    work for you.
                  </h2>
                </div>
                <span className="z-preview-avatar">AS</span>
              </div>
              <div className="z-preview-tabs">
                <span className="is-active">Discover</span>
                <span>Prepare</span>
                <span>Track</span>
              </div>
              <div className="z-preview-job">
                <div className="z-company-icon">N</div>
                <div>
                  <h3>Full-stack Engineer</h3>
                  <p>Northstar Labs · Remote</p>
                </div>
                <span className="z-sample-score">
                  80<span>/100</span>
                </span>
              </div>
              <div className="z-preview-reason">
                <Sparkles size={15} />
                <span>Relevant skills, clearly explained.</span>
              </div>
              <div className="z-tag-row">
                <span>TypeScript</span>
                <span>React</span>
                <span>Java</span>
              </div>
              <div className="z-preview-divider" />
              <div className="z-preview-next">
                <div className="z-small-icon">
                  <FileText size={18} />
                </div>
                <div>
                  <strong>Your next step</strong>
                  <p>Review a draft. Make it your own.</p>
                </div>
                <Link href="/demo" aria-label="Open interactive career demo">
                  <ArrowUpRight size={20} />
                </Link>
              </div>
            </div>
            <div className="z-preview-foot">
              <span>
                <span className="z-status-dot" /> Fictional profile & role
              </span>
              <span>
                Explore without signing in <ChevronRight size={13} />
              </span>
            </div>
          </div>
          <div className="z-orbit-label" aria-hidden="true">
            A WORKSPACE WITH DIRECTION <span>↗</span>
          </div>
        </section>
        <section className="z-principles-strip">
          <div className="z-container">
            <span>Built around your next move</span>
            <p>
              <Check size={17} /> Understand your strengths
            </p>
            <p>
              <Check size={17} /> Prepare with intention
            </p>
            <p>
              <Check size={17} /> Keep the full picture
            </p>
          </div>
        </section>
        <section className="z-container z-how" id="how-it-works">
          <div className="z-section-heading">
            <div>
              <span className="z-eyebrow">LESS SCATTER. MORE DIRECTION.</span>
              <h2>
                A thoughtful process.
                <br />
                From profile to progress.
              </h2>
            </div>
            <p>
              Your job search has a lot of moving parts. Give them a place to
              come together.
            </p>
          </div>
          <div className="z-feature-grid">
            {[
              {
                n: "01",
                icon: Target,
                title: "Start with your story",
                text: "Bring in your resume and review the extracted information. Build a profile that reflects what you can actually do.",
              },
              {
                n: "02",
                icon: Search,
                title: "Find a relevant direction",
                text: "Explore roles alongside skill-based match signals. Use the score as a starting point for your own judgment.",
              },
              {
                n: "03",
                icon: FileText,
                title: "Prepare, then take the lead",
                text: "Review application drafts, adapt them to your voice, and track the status yourself. Preparation never means submitted.",
              },
            ].map(({ n, icon: Icon, title, text }) => (
              <article className="z-feature" key={n}>
                <div className="z-feature-top">
                  <Icon size={23} strokeWidth={1.5} />
                  <span>{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="z-container z-demo-invitation">
          <div>
            <span className="z-eyebrow">EXPLORE BEFORE YOU BEGIN</span>
            <h2>
              A real feel for the flow.
              <br />
              No account required.
            </h2>
            <p>
              Try a fictional profile, compare sample roles, preview a document,
              and move an application through the tracker.
            </p>
            <Link href="/demo" className="z-button z-button-lime">
              Open the interactive demo <ArrowUpRight size={18} />
            </Link>
          </div>
          <div className="z-flow-stack" aria-hidden="true">
            <span>
              <span>01</span> Your profile <Check size={17} />
            </span>
            <span>
              <span>02</span> Relevant opportunities <Search size={17} />
            </span>
            <span>
              <span>03</span> A considered application <FileText size={17} />
            </span>
            <span>
              <span>04</span> The next step <ArrowUpRight size={17} />
            </span>
          </div>
        </section>
      </main>
      <footer className="z-container z-footer">
        <ZenithBrand />
        <p>Make room for what comes next.</p>
        <div>
          <Link href="/demo">Demo</Link>
          <Link href="/about">About</Link>
          <Link href="/auth/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
