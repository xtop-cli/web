import Link from "next/link";

const P = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "";

export default function NotFound() {
  return (
    <div className="error-wrap">
      <div>
        <p className="error-code">404</p>
        <p style={{ color: "var(--muted)" }}>
          <span style={{ color: "var(--accent)" }}>error:</span> page not found
        </p>
        <p style={{ margin: "1.2rem 0 0", display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href={`${P}/`}>
            Home
          </Link>
          <Link className="btn btn-ghost" href={`${P}/docs/`}>
            Docs
          </Link>
        </p>
      </div>
    </div>
  );
}
