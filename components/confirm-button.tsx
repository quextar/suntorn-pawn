'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';

// ปุ่มส่งฟอร์มที่ถามยืนยันก่อน และกันกดซ้ำระหว่างบันทึก
export function SubmitButton({ confirm, children, ...props }: ButtonProps & { confirm?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      {...props}
    >
      {pending && <Loader2 className="size-4 animate-spin" />}
      {children}
    </Button>
  );
}
