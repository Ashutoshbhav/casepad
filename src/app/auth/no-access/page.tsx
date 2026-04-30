export default function NoAccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-2xl font-semibold">Access not granted</h1>
        <p className="text-zinc-400">Your email is not on the CasePad cohort allowlist. Ask Ash to add you.</p>
      </div>
    </main>
  );
}
