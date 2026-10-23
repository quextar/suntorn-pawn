import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, MapPin, Printer, Tag, User, XCircle } from 'lucide-react';
import { requireProfile } from '@/lib/auth';
import { baht, ITEM_STATUS, thDate, thDateTime, todayTH, TX_KIND } from '@/lib/format';
import { dueAfterRenew, dueInfo, interestDue } from '@/lib/contracts';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { SubmitButton } from '@/components/confirm-button';
import { Flash } from '@/components/flash';
import { Page } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { addPrincipal, approve, cancel, fee, forfeit, moveItem, redeem, reject, renew } from './actions';

function Money({ label, value, tone, hint }: { label: string; value: string; tone?: 'red' | 'navy'; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-xl font-bold tabular-nums', tone === 'red' && 'text-destructive', tone === 'navy' && 'text-primary')}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default async function ContractPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string; ok?: string } }) {
  const { supabase, profile } = await requireProfile();
  const isCeo = profile.role === 'ceo';
  const { data: c } = await supabase.from('contracts')
    .select(`*, customer:customers(id, full_name, phone, national_id, is_blacklisted),
             item:items(*, category:item_categories(name), location:locations(id, code)),
             created:profiles!contracts_created_by_fkey(full_name), decided:profiles!contracts_decided_by_fkey(full_name)`)
    .eq('id', params.id).single();
  if (!c) notFound();

  const [{ data: interest }, { data: txs }, { data: locations }, photoUrls] = await Promise.all([
    supabase.rpc('contract_interest_due', { p_id: c.id }).single<{ days: number; amount: number }>(),
    supabase.from('contract_transactions').select('*, by:profiles(full_name)').eq('contract_id', c.id).order('created_at'),
    supabase.from('locations').select('id, code').order('code'),
    c.item.photos?.length ? supabase.storage.from('item-photos').createSignedUrls(c.item.photos, 600) : Promise.resolve({ data: [] }),
  ]);

  const today = todayTH();
  const due = dueInfo(c, today);
  const interestAmt = Number(interest?.amount ?? 0);
  const principal = Number(c.principal ?? 0);
  const checklist = Object.entries((c.item.checklist ?? {}) as Record<string, boolean>);
  const monthly = c.interest_calc === 'monthly';
  const months = interestDue(c, today).months;
  const canForfeit = c.status === 'active' && (isCeo || due?.pastGrace);

  return (
    <Page>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="m-0 text-2xl font-bold text-primary md:text-3xl">{c.contract_no}</h1>
            <StatusBadge status={c.status} overdue={due?.overdue} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {c.item.name} · รับเมื่อ {thDateTime(c.created_at)} โดย {c.created?.full_name ?? '–'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['active', 'redeemed', 'forfeited'].includes(c.status) && (
            <Button asChild variant="outline" className="gap-1.5">
              <Link href={`/print/ticket/${c.id}`} target="_blank"><Printer className="size-4" /> พิมพ์ตั๋ว</Link>
            </Button>
          )}
          {['active', 'forfeited'].includes(c.status) && (
            <Button asChild variant="outline" className="gap-1.5">
              <Link href={`/print/labels?items=${c.item.id}`} target="_blank"><Tag className="size-4" /> สติกเกอร์ QR</Link>
            </Button>
          )}
        </div>
      </div>
      <Flash searchParams={searchParams} />

      {c.status === 'active' && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Money label="เงินต้น" value={`฿${baht(principal)}`} tone="navy" hint={`ดอกเบี้ย ${c.interest_rate}% ต่อเดือน`} />
          <Money
            label="ดอกเบี้ยถึงวันนี้" value={`฿${baht(interestAmt)}`}
            hint={monthly ? (months ? `${months} เดือน (${c.interest_rate}% x ${months})` : 'จ่ายล่วงหน้าแล้ว') : `${interest?.days ?? 0} วัน`}
          />
          <Money label="ยอดไถ่ถอนวันนี้" value={`฿${baht(principal + interestAmt)}`} tone="navy" />
          <Money
            label="ครบกำหนด" value={thDate(c.due_date)} tone={due?.overdue ? 'red' : undefined}
            hint={`${due?.label} · ผ่อนผันถึง ${thDate(due?.graceEnd)}`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* การทำรายการ */}
          {c.status === 'pending' && (
            <Card className="border-amber-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Clock className="size-5 text-amber-600" /> รอผู้บริหารอนุมัติวงเงิน</CardTitle>
                <CardDescription>
                  ราคาประเมิน ฿{baht(c.appraised_value)} · ลูกค้าขอ ฿{baht(c.requested_amount)}
                </CardDescription>
              </CardHeader>
              {isCeo ? (
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <form action={approve} className="grid gap-2 rounded-lg border p-3">
                    <input type="hidden" name="id" value={c.id} />
                    <Label htmlFor="principal">วงเงินที่อนุมัติ (บาท)</Label>
                    <Input id="principal" name="principal" required inputMode="decimal" defaultValue={Number(c.requested_amount)} className="h-11 text-lg" />
                    <Input name="note" placeholder="หมายเหตุ (ถ้ามี)" />
                    <SubmitButton className="gap-1.5" confirm="อนุมัติวงเงินและเริ่มสัญญา?"><CheckCircle2 className="size-4" /> อนุมัติ</SubmitButton>
                  </form>
                  <form action={reject} className="grid content-start gap-2 rounded-lg border p-3">
                    <input type="hidden" name="id" value={c.id} />
                    <Label htmlFor="reject-note">เหตุผลที่ไม่อนุมัติ</Label>
                    <Input id="reject-note" name="note" placeholder="เช่น สินค้ามีตำหนิมาก" className="h-11" />
                    <SubmitButton variant="outline" className="gap-1.5 text-destructive" confirm="ไม่อนุมัติสัญญานี้?"><XCircle className="size-4" /> ไม่อนุมัติ</SubmitButton>
                  </form>
                </CardContent>
              ) : (
                <CardContent className="text-sm text-muted-foreground">ยังจ่ายเงินลูกค้าไม่ได้ รอผู้บริหารกดอนุมัติก่อน</CardContent>
              )}
            </Card>
          )}

          {c.status === 'active' && (
            <Card>
              <CardHeader><CardTitle className="text-lg">ทำรายการ</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <form action={renew} className="grid content-between gap-2 rounded-lg border p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <div className="font-semibold">ต่อดอก</div>
                    <div className="text-sm text-muted-foreground">รับดอกเบี้ย ฿{baht(interestAmt)} ครบกำหนดใหม่ {thDate(dueAfterRenew(c, today))}</div>
                  </div>
                  <SubmitButton confirm={`รับดอกเบี้ย ${baht(interestAmt)} บาท และต่อสัญญา?`}>รับดอกเบี้ย ฿{baht(interestAmt)}</SubmitButton>
                </form>
                <form action={redeem} className="grid content-between gap-2 rounded-lg border border-emerald-300 bg-emerald-50/50 p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <div className="font-semibold">ไถ่ถอน</div>
                    <div className="text-sm text-muted-foreground">รับเงินต้น ฿{baht(principal)} + ดอก ฿{baht(interestAmt)} แล้วคืนสินค้า</div>
                  </div>
                  <SubmitButton className="bg-emerald-700 hover:bg-emerald-700/90" confirm={`รับเงิน ${baht(principal + interestAmt)} บาท และคืนสินค้าให้ลูกค้า?`}>
                    รับเงิน ฿{baht(principal + interestAmt)}
                  </SubmitButton>
                </form>
                <form action={fee} className="grid gap-2 rounded-lg border p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div className="font-semibold">ค่าดำเนินการ</div>
                  <div className="text-sm text-muted-foreground">รับเงินตามจำนวนที่กรอก ไม่หักเงินต้น วันครบกำหนดเท่าเดิม</div>
                  <Input name="amount" required inputMode="decimal" placeholder="จำนวนเงิน (บาท)" className="h-11" />
                  <Input name="note" placeholder="รายละเอียด (ถ้ามี)" />
                  <SubmitButton variant="outline" confirm="ยืนยันรับค่าดำเนินการ?">บันทึกค่าดำเนินการ</SubmitButton>
                </form>
                {isCeo && (
                  <form action={addPrincipal} className="grid gap-2 rounded-lg border p-3">
                    <input type="hidden" name="id" value={c.id} />
                    <div className="font-semibold">เพิ่มต้น (ผู้บริหาร)</div>
                    <div className="text-sm text-muted-foreground">เก็บดอกถึงวันนี้ ฿{baht(interestAmt)} แล้วจ่ายเงินเพิ่ม</div>
                    <Input name="amount" required inputMode="decimal" placeholder="จำนวนเงินที่เพิ่ม" className="h-11" />
                    <SubmitButton variant="outline" confirm="ยืนยันเพิ่มเงินต้น?">บันทึกเพิ่มต้น</SubmitButton>
                  </form>
                )}
                <form action={forfeit} className="grid content-between gap-2 rounded-lg border border-destructive/30 p-3">
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <div className="font-semibold text-destructive">หลุดจำนำ</div>
                    <div className="text-sm text-muted-foreground">
                      {canForfeit ? 'สินค้าเปลี่ยนเป็นรอขาย' : `ทำได้หลังพ้นผ่อนผัน ${thDate(due?.graceEnd)}`}
                    </div>
                  </div>
                  <SubmitButton variant="destructive" disabled={!canForfeit} confirm="ยืนยันสินค้าหลุดจำนำ?">บันทึกหลุดจำนำ</SubmitButton>
                </form>
              </CardContent>
            </Card>
          )}

          {c.status !== 'pending' && c.status !== 'active' && (
            <Card>
              <CardContent className="p-4 text-sm">
                สัญญาปิดแล้วเมื่อ {thDateTime(c.closed_at)}
                {c.decision_note && <> · {c.decision_note}</>}
              </CardContent>
            </Card>
          )}

          {/* สินค้า */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{c.item.name}</CardTitle>
              <CardDescription>
                {[c.item.category?.name, c.item.brand, c.item.model].filter(Boolean).join(' · ')}
                {c.item.serial_no && <> · S/N {c.item.serial_no}</>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {photoUrls.data && photoUrls.data.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {photoUrls.data.map((p) => p.signedUrl && (
                    <a key={p.signedUrl} href={p.signedUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.signedUrl} alt="รูปสินค้า" className="size-32 rounded-lg border object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {c.item.description && <p className="text-sm">{c.item.description}</p>}
              {checklist.length > 0 && (
                <div className="grid gap-1 sm:grid-cols-2">
                  {checklist.map(([k, ok]) => (
                    <div key={k} className="flex items-center gap-2 text-sm">
                      {ok ? <CheckCircle2 className="size-4 text-emerald-600" /> : <XCircle className="size-4 text-destructive" />} {k}
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span>ราคาประเมิน ฿{baht(c.appraised_value)}</span>
                <span>ลูกค้าขอ ฿{baht(c.requested_amount)}</span>
                {c.decided && <span>อนุมัติโดย {c.decided.full_name} {thDateTime(c.decided_at)}</span>}
              </div>
            </CardContent>
          </Card>

          {/* ประวัติเงิน */}
          <Card>
            <CardHeader><CardTitle className="text-lg">ประวัติการทำรายการ</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <tr><th className="p-3">วันที่</th><th className="p-3">รายการ</th><th className="p-3 text-right">รับเงิน</th><th className="p-3 text-right">จ่ายเงิน</th><th className="p-3 text-right">ต้นคงเหลือ</th><th className="p-3">โดย</th></tr>
                </thead>
                <tbody className="divide-y">
                  {!txs?.length && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">ยังไม่มีรายการ</td></tr>}
                  {txs?.map((t) => (
                    <tr key={t.id}>
                      <td className="p-3 whitespace-nowrap">{thDateTime(t.created_at)}</td>
                      <td className="p-3">
                        {TX_KIND[t.kind] ?? t.kind}
                        {Number(t.interest_amount) > 0 && <span className="text-xs text-muted-foreground"> (ดอก ฿{baht(t.interest_amount)} / {t.interest_days} วัน)</span>}
                      </td>
                      <td className="p-3 text-right tabular-nums">{Number(t.cash_in) ? baht(t.cash_in) : ''}</td>
                      <td className="p-3 text-right tabular-nums">{Number(t.cash_out) ? baht(t.cash_out) : ''}</td>
                      <td className="p-3 text-right tabular-nums">{t.principal_after != null ? baht(t.principal_after) : ''}</td>
                      <td className="p-3">{t.by?.full_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="size-4" /> ลูกค้า</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Link href={`/customers/${c.customer.id}`} className="font-semibold text-primary hover:underline">{c.customer.full_name}</Link>
              <div>{c.customer.phone ?? '–'}</div>
              {c.customer.is_blacklisted && <div className="font-semibold text-destructive">อยู่ในบัญชีดำ</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><MapPin className="size-4" /> ตำแหน่งเก็บ</CardTitle>
              <CardDescription>{ITEM_STATUS[c.item.status]}{c.item.location && <> · <b className="text-foreground">{c.item.location.code}</b></>}</CardDescription>
            </CardHeader>
            {['in_storage', 'forfeited'].includes(c.item.status) && (
              <CardContent>
                <form action={moveItem} className="grid gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="item_id" value={c.item.id} />
                  <NativeSelect name="location_id" defaultValue={c.item.location?.id ?? ''} className="h-11">
                    <option value="">– ยังไม่ได้เก็บเข้าช่อง –</option>
                    {locations?.map((l) => <option key={l.id} value={l.id}>{l.code}</option>)}
                  </NativeSelect>
                  <SubmitButton variant="outline">บันทึกตำแหน่ง</SubmitButton>
                </form>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">เงื่อนไขสัญญา</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>อายุสัญญา {c.term_months} เดือน · ผ่อนผัน {c.grace_days} วัน</div>
              <div>ดอกเบี้ย {c.interest_rate}% ต่อเดือน ({c.interest_calc === 'daily' ? 'คิดตามวัน' : 'คิดเป็นเดือน'})</div>
              {c.start_date && <div>เริ่ม {thDate(c.start_date)} · ครบกำหนด {thDate(c.due_date)}</div>}
            </CardContent>
          </Card>

          {isCeo && ['pending', 'active'].includes(c.status) && (
            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-lg">ยกเลิกสัญญา (ผู้บริหาร)</CardTitle></CardHeader>
              <CardContent>
                <form action={cancel} className="grid gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <Input name="reason" required placeholder="เหตุผล เช่น บันทึกผิด" />
                  <SubmitButton variant="outline" className="text-destructive" confirm="ยกเลิกสัญญานี้? ย้อนกลับไม่ได้">ยกเลิกสัญญา</SubmitButton>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}
