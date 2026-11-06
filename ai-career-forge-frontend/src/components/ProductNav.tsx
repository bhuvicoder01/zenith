"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import ZenithBrand from "./ZenithBrand";
export default function ProductNav() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="z-site-nav"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="z-container z-nav-inner">
        <ZenithBrand />
        <nav
          aria-label="Main navigation"
          className={`z-nav-links ${open ? "is-open" : ""}`}
          id="product-navigation"
        >
          <Link href="/#how-it-works" onClick={() => setOpen(false)}>
            How it works
          </Link>
          <Link href="/demo" onClick={() => setOpen(false)}>
            Explore the demo
          </Link>
          <Link href="/community" onClick={() => setOpen(false)}>
            Community
          </Link>
          <Link href="/auth/login" className="z-mobile-signin">
            Sign in
          </Link>
        </nav>
        <div className="z-nav-actions">
          <Link href="/auth/login" className="z-signin">
            Sign in
          </Link>
          <Link
            href="/auth/register"
            className="z-button z-button-dark z-button-small"
          >
            Get started <ArrowUpRight size={15} />
          </Link>
          <button
            ref={menuButton}
            className="z-menu-button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="product-navigation"
            aria-label={open ? "Close navigation" : "Open navigation"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}
