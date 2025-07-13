'use client';
import { ReactQueryDevtools } from 'react-query/devtools';

export default function ReactQueryDevTools() {
  // Only show devtools in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return <ReactQueryDevtools initialIsOpen={false} />;
} 