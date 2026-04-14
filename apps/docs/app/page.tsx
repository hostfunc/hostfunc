import Link from "next/link";

export default function DocsHomePage() {
  return (
    <div>
      <h1>Hostfunc Docs</h1>
      <p>Documentation site scaffold for launch.</p>
      <ul>
        <li>
          <Link href="/getting-started/install">Getting started: install</Link>
        </li>
        <li>
          <Link href="/getting-started/quickstart">Getting started: quickstart</Link>
        </li>
        <li>
          <Link href="/concepts/architecture">Concepts: architecture</Link>
        </li>
      </ul>
    </div>
  );
}
