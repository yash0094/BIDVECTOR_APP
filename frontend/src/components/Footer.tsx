export function Footer({ dark = false }: { dark?: boolean }) {
  const year = new Date().getFullYear()
  return (
    <footer className={`no-print border-t py-6 text-center text-[12.5px] ${
      dark ? 'border-white/10 bg-ink-900 text-white/50' : 'border-ink-200 bg-white text-ink-500'}`}>
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-3 px-6 sm:flex-row">
        <p>&copy; {year} BidVector. All rights reserved.</p>
        <div className="flex gap-5 text-[11.5px]">
          <a href="/app/help" className="hover:underline">Platform Guidelines</a>
          <a href="/public/tenders" className="hover:underline">Public Dashboard</a>
          <a href="/login" className="hover:underline">Official Authentication</a>
        </div>
      </div>
    </footer>
  )
}
