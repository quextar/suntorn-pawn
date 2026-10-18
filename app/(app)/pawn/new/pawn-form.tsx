'use client';

import { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/confirm-button';
import { PhotoUpload } from '@/components/photo-upload';
import { createPawn } from './actions';

type Category = { id: string; name: string; checklist: string[] };

export function PawnForm({ customerId, branchId, categories }: { customerId: string; branchId: string; categories: Category[] }) {
  const [catId, setCatId] = useState(categories[0]?.id ?? '');
  const cat = categories.find((c) => c.id === catId);
  const [checked, setChecked] = useState<string[]>([]);

  return (
    <form action={createPawn} className="grid gap-4 lg:grid-cols-5">
      <input type="hidden" name="customer_id" value={customerId} />
      <input type="hidden" name="checklist_all" value={JSON.stringify(cat?.checklist ?? [])} />

      <div className="grid gap-4 lg:col-span-3">
        <Card>
          <CardHeader><CardTitle className="text-lg">1. รายละเอียดสินค้า</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="category_id">ประเภท</Label>
              <NativeSelect
                id="category_id" name="category_id" value={catId} className="h-11"
                onChange={(e) => { setCatId(e.target.value); setChecked([]); }}
              >
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="name">ชื่อสินค้า</Label>
              <Input id="name" name="name" required placeholder="เช่น iPhone 15 Pro 256GB สีดำ" className="h-11" />
            </div>
            <div className="grid gap-1.5"><Label htmlFor="brand">ยี่ห้อ</Label><Input id="brand" name="brand" className="h-11" /></div>
            <div className="grid gap-1.5"><Label htmlFor="model">รุ่น</Label><Input id="model" name="model" className="h-11" /></div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="serial_no">หมายเลขเครื่อง / Serial / IMEI</Label>
              <Input id="serial_no" name="serial_no" className="h-11" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="description">สภาพ / ตำหนิ / อุปกรณ์ที่ให้มา</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">2. รูปสินค้า</CardTitle>
            <CardDescription>ถ่ายให้เห็นตัวสินค้า ตำหนิ และหมายเลขเครื่อง</CardDescription>
          </CardHeader>
          <CardContent>
            <PhotoUpload bucket="item-photos" branchId={branchId} name="photos" required />
          </CardContent>
        </Card>
      </div>

      <div className="grid content-start gap-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CheckSquare className="size-4" /> 3. ทดสอบตามเช็กลิสต์</CardTitle>
            <CardDescription>{cat?.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {cat?.checklist.map((item) => (
              <label key={item} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                <input
                  type="checkbox" name="checklist" value={item} className="size-5 accent-[hsl(225_75%_22%)]"
                  checked={checked.includes(item)}
                  onChange={(e) => setChecked((p) => (e.target.checked ? [...p, item] : p.filter((x) => x !== item)))}
                />
                <span className="text-sm">{item}</span>
              </label>
            ))}
            <p className="text-xs text-muted-foreground">ผ่าน {checked.length} จาก {cat?.checklist.length ?? 0} ข้อ</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. เสนอราคา</CardTitle>
            <CardDescription>ผู้บริหารจะเป็นคนกำหนดวงเงินจริง</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="appraised_value">ราคาประเมินสินค้า (บาท)</Label>
              <Input id="appraised_value" name="appraised_value" required inputMode="decimal" className="h-11 text-lg tabular-nums" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="requested_amount">ยอดที่ลูกค้าขอ (บาท)</Label>
              <Input id="requested_amount" name="requested_amount" required inputMode="decimal" className="h-11 text-lg tabular-nums" />
            </div>
            <SubmitButton size="lg" className="mt-2">ส่งให้ผู้บริหารอนุมัติ</SubmitButton>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
