import { ReactNode } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="ml-14 min-h-screen p-4 lg:ml-60 lg:p-6">{children}</main>
    </div>
  );
}
