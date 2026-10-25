'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <span className="eyebrow">ORBIT / WORKSPACE</span>
      <h1>Let's try that again.</h1>
      <p>Your learning data is stored safely in this browser.</p>
      <button className="button" onClick={reset}>
        Reopen workspace
      </button>
    </main>
  );
}
