export default function BetterCanvasLayout({ children }) {
  return (
    <main className="w-full max-w-2xl mx-auto p-4 lg:py-8 xl:py-16 space-y-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:pt-4 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6">
      {children}
      <nav className="flex gap-4 pt-8 text-sm text-fg-2">
        <a href="/bettercanvas">Better Canvas</a>
        <a href="/bettercanvas/privacy">Privacy</a>
        <a href="/bettercanvas/terms">Terms</a>
        <a href="/">joshuamarkle.com</a>
      </nav>
    </main>
  );
}
