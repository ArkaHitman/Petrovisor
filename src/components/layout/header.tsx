'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import ThemeToggle from '../theme-toggle';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';

export default function Header() {
  const handleDownload = () => {
    console.log("Downloading report...");
    alert("PDF generation is a planned feature!");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        {/* Page title could go here if needed */}
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
