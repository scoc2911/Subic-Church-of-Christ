import Link from 'next/link';

export default function NotFound() {
  return (
    <div id="not-found-container" className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center font-sans">
      <div id="not-found-card" className="max-w-md space-y-4 bg-white p-8 border border-gray-200 rounded-2xl shadow-xs">
        <h1 id="not-found-title" className="text-4xl font-extrabold text-blue-600">404</h1>
        <h2 id="not-found-subtitle" className="text-xl font-bold text-gray-900 uppercase tracking-tight">Page Not Found</h2>
        <p id="not-found-desc" className="text-sm text-gray-500">The requested page does not exist or has been moved.</p>
        <div id="not-found-action" className="pt-2">
          <Link href="/" id="btn-back-home" className="inline-flex items-center justify-center px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition cursor-pointer">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
