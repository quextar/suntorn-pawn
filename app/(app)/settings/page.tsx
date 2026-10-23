import { requireCeo } from '@/lib/auth';
import { back, num, str } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Page, PageHeader } from '@/components/page-header';

async function saveSettings(f: FormData) {
  'use server';
  const { supabase, profile } = await requireCeo();
  const term = num(f, 'contract_term_months');
  const grace = num(f, 'grace_period_days');
  const rate = num(f, 'interest_rate_percent_per_month');
  if (!term || term < 1 || grace == null || grace < 0 || !rate || rate <= 0) back('/settings', 'error', 'กรอกตัวเลขให้ถูกต้อง');
  const rows = [
    ['contract_term_months', term], ['grace_period_days', grace], ['interest_rate_percent_per_month', rate],
    ['interest_calc', str(f, 'interest_calc') === 'monthly' ? 'monthly' : 'daily'], ['ticket_paper', 'A4'],
  ].map(([key, value]) => ({ branch_id: profile.branch_id, key, value, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from('settings').upsert(rows);
  if (error) back('/settings', 'error', error.message);
  back('/settings', 'ok', 'บันทึกแล้ว ใช้กับสัญญาใหม่ตั้งแต่ตอนนี้ (สัญญาเดิมใช้ค่าเดิม)');
}

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

async function saveCategory(f: FormData) {
  'use server';
  const { supabase, profile } = await requireCeo();
  const id = str(f, 'id');
  const row = { branch_id: profile.branch_id, name: str(f, 'name'), checklist: lines(str(f, 'checklist')), sort: num(f, 'sort') ?? 50 };
  if (!row.name) back('/settings', 'error', 'กรอกชื่อประเภท');
  const { error } = id ? await supabase.from('item_categories').update(row).eq('id', id) : await supabase.from('item_categories').insert(row);
  if (error) back('/settings', 'error', error.code === '23505' ? 'มีประเภทนี้อยู่แล้ว' : error.message);
  back('/settings', 'ok', 'บันทึกประเภทสินค้าแล้ว');
}

async function deleteCategory(f: FormData) {
  'use server';
  const { supabase } = await requireCeo();
  const { error } = await supabase.from('item_categories').delete().eq('id', str(f, 'id'));
  if (error) back('/settings', 'error', 'ลบไม่ได้ เพราะมีสินค้าในประเภทนี้แล้ว');
  back('/settings', 'ok', 'ลบประเภทแล้ว');
}

export default async function Settings(props: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const searchParams = await props.searchParams;
  const { supabase } = await requireCeo();
  const [{ data: settings }, { data: cats }, { data: users }] = await Promise.all([
    supabase.from('settings').select('key, value'),
    supabase.from('item_categories').select('id, name, checklist, sort').order('sort'),
    supabase.from('profiles').select('id, full_name, role, created_at').order('created_at'),
  ]);
  const s = Object.fromEntries((settings ?? []).map((x) => [x.key, x.value])) as Record<string, string | number>;

  return (
    <Page>
      <PageHeader title="ตั้งค่า" description="ค่าที่เปลี่ยนจะใช้กับสัญญาใหม่ สัญญาเดิมใช้ค่า ณ วันที่ทำสัญญา" />
      <Flash searchParams={searchParams} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">สัญญาและดอกเบี้ย</CardTitle></CardHeader>
          <CardContent>
            <form action={saveSettings} className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>อายุสัญญา (เดือน)</Label><Input name="contract_term_months" inputMode="numeric" defaultValue={s.contract_term_months} /></div>
              <div className="grid gap-1.5"><Label>ผ่อนผันหลังครบกำหนด (วัน)</Label><Input name="grace_period_days" inputMode="numeric" defaultValue={s.grace_period_days} /></div>
              <div className="grid gap-1.5"><Label>ดอกเบี้ย (% ต่อเดือน)</Label><Input name="interest_rate_percent_per_month" inputMode="decimal" defaultValue={s.interest_rate_percent_per_month} /></div>
              <div className="grid gap-1.5">
                <Label>วิธีคิดดอกเบี้ย</Label>
                <NativeSelect name="interest_calc" defaultValue={String(s.interest_calc ?? 'daily')}>
                  <option value="daily">คิดตามจำนวนวันจริง</option>
                  <option value="monthly">คิดเป็นเดือน (เศษนับเป็นเดือน)</option>
                </NativeSelect>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">ตั๋วจำนำพิมพ์บนกระดาษ A4 (ส่วนลูกค้า + ส่วนร้าน)</p>
              <SubmitButton className="sm:col-span-2">บันทึก</SubmitButton>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ผู้ใช้</CardTitle>
            <CardDescription>เพิ่มผู้ใช้ใน Supabase › Authentication › Users ทุกคนเป็นพนักงานอัตโนมัติ (ดู ROLE_GUIDE.md)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {users?.map((u) => (
              <div key={u.id} className="flex justify-between rounded-md border p-2">
                <span>{u.full_name}</span>
                <span className={u.role === 'ceo' ? 'font-semibold text-primary' : 'text-muted-foreground'}>{u.role === 'ceo' ? 'ผู้บริหาร' : 'พนักงาน'}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ประเภทสินค้าและเช็กลิสต์ทดสอบ</CardTitle>
          <CardDescription>เช็กลิสต์ใส่บรรทัดละ 1 ข้อ พนักงานจะเห็นตอนรับจำนำ</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[...(cats ?? []), { id: '', name: '', checklist: [] as string[], sort: 50 }].map((c) => (
            <div key={c.id || 'new'} className="rounded-lg border p-3">
              <form action={saveCategory} className="grid gap-2">
                <input type="hidden" name="id" value={c.id} />
                <div className="flex gap-2">
                  <Input name="name" defaultValue={c.name} placeholder="ประเภทใหม่" required />
                  <Input name="sort" defaultValue={c.sort} inputMode="numeric" className="w-20" aria-label="ลำดับ" />
                </div>
                <Textarea name="checklist" rows={4} defaultValue={c.checklist.join('\n')} placeholder="เปิดเครื่องติด&#10;หน้าจอไม่แตก" />
                <SubmitButton variant={c.id ? 'outline' : 'default'} size="sm">{c.id ? 'บันทึก' : 'เพิ่มประเภท'}</SubmitButton>
              </form>
              {c.id && (
                <form action={deleteCategory} className="mt-1">
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="ghost" size="sm" className="w-full text-destructive" confirm={`ลบประเภท ${c.name}?`}>ลบ</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </Page>
  );
}
