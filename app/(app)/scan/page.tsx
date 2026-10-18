import { requireProfile } from '@/lib/auth';
import { Page, PageHeader } from '@/components/page-header';
import { ScanClient } from './scan-client';

export default async function Scan() {
  await requireProfile();
  return (
    <Page narrow>
      <PageHeader title="สแกน QR" description="สแกนสติกเกอร์สินค้าเพื่อเปิดสัญญา หรือสแกนช่องเก็บเพื่อดูของในช่อง" />
      <ScanClient />
    </Page>
  );
}
