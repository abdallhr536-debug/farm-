export interface Field { k: string; l: string; t?: string; o?: string[] | string; wo?: string[]; }
export interface Module { t: string; f: Field[]; p?: Record<string, string>; scoped?: boolean; aud?: boolean; }

export const MGR = 'مدير', ENG = 'مهندس', SUP = 'مشرف', WRK = 'عامل', VET = 'دكتور';
export const ROLES: string[] = [MGR, ENG, SUP, WRK, VET];
export const PERMS = [{ k: 'r', l: 'عرض' }, { k: 'a', l: 'إضافة' }, { k: 'e', l: 'تعديل' }, { k: 'd', l: 'حذف' }];

// من يقدر يوجّه ملاحظة لمين (حسب وظيفة الكاتب)
export const AUD: Record<string, string[]> = {
  [MGR]: ['الكل', 'العمال والمشرفين', 'العمال', 'المهندس'],
  [ENG]: ['العمال والمشرفين'],
  [SUP]: ['العمال', 'المهندس', 'المدير'],
  [VET]: ['المهندس والمدير'],
  [WRK]: [],
};
// من يشوف كل نوع ملاحظة
export const AUDV: Record<string, string[]> = {
  'الكل': ROLES, 'العمال': [WRK], 'العمال والمشرفين': [WRK, SUP],
  'المهندس': [ENG], 'المدير': [MGR], 'المهندس والمدير': [ENG, MGR],
};

const date: Field = { k: 'date', l: 'التاريخ', t: 'date' };
const house: Field = { k: 'house', l: 'العنبر', t: 'select', o: '@houses' };
const note: Field = { k: 'note', l: 'ملاحظات' };
const receipt: Field = { k: 'receipt', l: 'صورة الإيصال', t: 'file' };
const io: Field = { k: 'type', l: 'الحركة', t: 'select', o: ['وارد', 'صادر'] };
const emp: Field = { k: 'emp', l: 'الموظف', t: 'select', o: 'users' };
const all = (v: string) => ({ [ENG]: v, [SUP]: v, [WRK]: v, [VET]: v });

// المدير له كل الصلاحيات دائماً. باقي الصلاحيات r=عرض a=إضافة e=تعديل d=حذف
// ويقدر المدير يغيّرها من تبويب «الصلاحيات». لإضافة قسم جديد أضف مفتاحاً هنا.
export const M: Record<string, Module> = {
  cycles: { t: 'الدورات', p: { ...all('r'), [ENG]: 'rae' }, f: [
    { k: 'name', l: 'اسم الدورة' }, { k: 'vet', l: 'الدكتور المشرف' }, { k: 'start', l: 'تاريخ البدء', t: 'date' },
    { k: 'count', l: 'عدد الفراخ عند البدء', t: 'number' }, { k: 'status', l: 'الحالة', t: 'select', o: ['جارية', 'منتهية'] }] },
  users: { t: 'الفريق', p: { [ENG]: 'raed' }, f: [
    { k: 'name', l: 'الاسم' }, { k: 'role', l: 'الوظيفة', t: 'select', o: ROLES }, { k: 'email', l: 'الإيميل' },
    { k: 'phone', l: 'التليفون' }, { k: 'pass', l: 'كلمة المرور (اتركها فارغة لعدم التغيير)', t: 'password' },
    { k: 'house', l: 'العنبر' }, { k: 'wage', l: 'اليومية', t: 'number' },
    { k: 'start', l: 'تاريخ التعيين', t: 'date' }, { k: 'status', l: 'الحالة', t: 'select', o: ['يعمل', 'منتهي'] }] },
  attendance: { t: 'الحضور', f: [emp, date, { k: 'st', l: 'الحالة', t: 'select', o: ['حضور', 'غياب', 'إجازة'] }] },
  deduct: { t: 'الخصومات', p: { [ENG]: 'raed' }, f: [emp, date, { k: 'amt', l: 'المبلغ', t: 'number' }, { k: 'reason', l: 'السبب' }] },
  adv: { t: 'السلف', f: [emp, date, { k: 'amt', l: 'المبلغ', t: 'number' }, note] },
  leave: { t: 'الإجازات', f: [emp, { k: 'from', l: 'من', t: 'date' }, { k: 'to', l: 'إلى', t: 'date' },
    { k: 'kind', l: 'النوع', t: 'select', o: ['اعتيادية', 'مرضية', 'عارضة', 'بدون أجر'] },
    { k: 'st', l: 'الحالة', t: 'select', o: ['معلقة', 'موافق', 'مرفوضة'] }] },
  feed: { t: 'العلف', scoped: true, p: { [ENG]: 'raed', [SUP]: 'ra', [WRK]: 'ra', [VET]: 'r' }, f: [
    date, house, { ...io, wo: ['صادر'] }, { k: 'kind', l: 'نوع العلف' }, { k: 'qty', l: 'الكمية (كجم)', t: 'number' }, receipt, note] },
  dead: { t: 'النافق', scoped: true, p: { [ENG]: 'raed', [SUP]: 'ra', [WRK]: 'ra', [VET]: 'r' }, f: [
    date, house, { k: 'cyc', l: 'الدورة', t: 'select', o: 'cycles' }, { k: 'n', l: 'عدد النافق', t: 'number' }, { k: 'cause', l: 'السبب' }] },
  gas: { t: 'الغاز', scoped: true, p: { [ENG]: 'raed', [SUP]: 'ra' }, f: [date, house, { k: 'qty', l: 'الكمية', t: 'number' }, note] },
  water: { t: 'المياه', scoped: true, p: { [ENG]: 'raed', [SUP]: 'ra' }, f: [date, house, { k: 'qty', l: 'الكمية', t: 'number' }, note] },
  meds: { t: 'الأدوية', p: { [ENG]: 'raed', [SUP]: 'ra', [VET]: 'r' }, f: [
    date, io, { k: 'name', l: 'اسم الدواء' }, { k: 'qty', l: 'الكمية', t: 'number' }, receipt, note] },
  receipts: { t: 'الاستلامات', p: { [ENG]: 'raed', [SUP]: 'ra' }, f: [
    date, { k: 'what', l: 'الصنف / اللي وصل من برا' }, { k: 'qty', l: 'الكمية', t: 'number' }, receipt, note] },
  vet: { t: 'الدكتور', p: { [VET]: 'raed', [ENG]: 'r' }, f: [
    date, { k: 'kind', l: 'النوع', t: 'select', o: ['جلب دواء', 'إرجاع دواء', 'زيارة'] }, { k: 'name', l: 'الدواء' },
    { k: 'qty', l: 'الكمية', t: 'number' }, { k: 'price', l: 'السعر', t: 'number' },
    { k: 'birds', l: 'عدد الفراخ يومها', t: 'number' }, note] },
  notes: { t: 'الملاحظات', aud: true, p: { [ENG]: 'ra', [SUP]: 'ra', [VET]: 'ra', [WRK]: 'r' }, f: [
    date, { k: 'to', l: 'تظهر لـ', t: 'select', o: '@aud' }, { k: 'text', l: 'الملاحظة' }] },
  complaints: { t: 'الشكاوى', p: all('a'), f: [date, { k: 'text', l: 'نص الشكوى' }] },
  shifts: { t: 'الورديات', p: { ...all('r'), [ENG]: 'raed' }, f: [emp, date, { k: 'shift', l: 'الوردية', t: 'select', o: ['صباحي', 'مسائي'] }] },
  kitchen: { t: 'المطبخ', p: all('r'), f: [{ k: 'name', l: 'الاسم' }, { k: 'job', l: 'الوظيفة', t: 'select', o: ['طباخ', 'مساعد'] }] },
  meals: { t: 'الأكل', p: { [ENG]: 'ra', [SUP]: 'ra', [WRK]: 'ra', [VET]: 'r' }, f: [
    date, { k: 'meal', l: 'الوجبة' }, { k: 'avail', l: 'الحالة', t: 'select', o: ['متاح', 'خلص'] }, note] },
  votes: { t: 'رأي الأكل', p: all('ra'), f: [
    date, { k: 'meal', l: 'الوجبة' }, { k: 'taste', l: 'الطعم', t: 'select', o: ['مالح', 'عادي', 'مسكر', 'حلو', 'وحش'] },
    { k: 'want', l: 'نفسي في' }, note] },
  cams: { t: 'الكاميرات', f: [{ k: 'name', l: 'اسم الكاميرا' }, { k: 'loc', l: 'الموقع (عنبر ...)' }, { k: 'url', l: 'رابط البث' },
    { k: 'kind', l: 'نوع الرابط', t: 'select', o: ['صفحة (iframe)', 'صورة / MJPEG'] }] },
};
