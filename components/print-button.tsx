'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintButton() {
  return (
    <Button onClick={() => window.print()} className="gap-1.5 print:hidden">
      <Printer className="size-4" /> พิมพ์
    </Button>
  );
}
