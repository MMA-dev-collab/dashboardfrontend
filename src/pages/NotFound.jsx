import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 px-4">
      <div className="bg-primary/10 p-4 rounded-full">
        <FileQuestion className="w-12 h-12 text-primary" />
      </div>
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <h2 className="text-2xl font-semibold text-foreground/80">Page Not Found</h2>
      <p className="text-muted-foreground max-w-sm mb-4">
        We couldn't find the page you're looking for. It might have been moved or doesn't exist.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
      >
        <Home className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
