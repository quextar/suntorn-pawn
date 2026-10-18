# วิธีตั้งสิทธิ์ CEO และพนักงาน

สิทธิ์เก็บที่ **ตาราง `public.profiles` ช่อง `role`** ไม่ใช่ role ในทีม Supabase และไม่ใช่ metadata ของบัญชีล็อกอิน

| ค่า | ใช้ทำอะไรได้ |
| --- | --- |
| `ceo` | เห็นทุกอย่าง, กำหนดวงเงิน, แก้ไข/ยกเลิกรายการ, ตั้งค่าดอกเบี้ย, บัญชีดำ, ดูประวัติการแก้ไข, จัดการผู้ใช้ |
| `staff` | หน้าร้านและคลัง: เพิ่มลูกค้า, รับของ, ตีราคาเสนอ, รับชำระ, จัดเก็บ/ค้นหาสินค้า (แก้ไขหรือลบไม่ได้) |

## 1. เพิ่มผู้ใช้

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**
2. ใส่อีเมลและรหัสผ่าน ติ๊ก Auto Confirm User
3. ระบบสร้างโปรไฟล์ให้อัตโนมัติ เป็น `staff` เสมอ

## 2. ตั้งตัวเองเป็น CEO

**SQL Editor → New query** แก้อีเมลและชื่อ แล้วกด **Run**:

```sql
update public.profiles p
set role = 'ceo', full_name = 'ชื่อ CEO'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('your-email@example.com')
returning u.email, p.full_name, p.role;
```

ต้องเห็นผล 1 แถวที่ `role = ceo` ถ้าไม่มีแถว แปลว่าอีเมลไม่ตรง

## 3. ตั้งหรือเปลี่ยนกลับเป็นพนักงาน

```sql
update public.profiles p
set role = 'staff', full_name = 'ชื่อพนักงาน'
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('staff@example.com')
returning u.email, p.full_name, p.role;
```

## 4. ดูว่าตอนนี้ใครเป็นอะไร

```sql
select u.email, p.full_name, p.role, p.id
from public.profiles p
join auth.users u on u.id = p.id
order by p.role, p.full_name;
```

## แก้ผ่านตารางแทน SQL

1. ดู UUID ของบัญชีใน **Authentication → Users**
2. เปิด **Table Editor → public.profiles** หาแถวที่ `id` ตรงกัน
3. แก้ `role` เป็น `ceo` หรือ `staff` แล้วบันทึก

## ข้อควรรู้

- พนักงานตั้งตัวเองเป็น CEO จากหน้าเว็บไม่ได้ ฐานข้อมูลบล็อกไว้
- อย่าใช้ `user_metadata.role` กำหนดสิทธิ์ เพราะผู้ใช้แก้เองได้
- ไม่ควรแชร์รหัสผ่านบัญชี CEO
