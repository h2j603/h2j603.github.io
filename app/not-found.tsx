import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl">404</h1>
      <p>Not found.</p>
      <Link href="/" className="underline">
        Home
      </Link>
    </div>
  );
}
