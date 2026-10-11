import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AUD, AUDV, Field, M, MGR, PERMS, ROLES, WRK } from './config';
import { StoreService } from './store.service';

@Component({ selector: 'app-root', standalone: true, imports: [FormsModule], templateUrl: './app.component.html' })
export class AppComponent {
  M = M; MGR = MGR; PERMS = PERMS;
  keys = Object.keys(M);
  roles2 = ROLES.filter(r => r !== MGR);
  cur = 'home';
  edit: { k: string; id?: string } | null = null;
  form: any = {};
  lg = { id: '', pw: '' };
  su = { name: '', email: '', phone: '', pass: '' };
  err = '';
  pm = new Date().toISOString().slice(0, 7);
  private urls = new Map<string, SafeResourceUrl>();

  constructor(public s: StoreService, private san: DomSanitizer) {}

  // ---------- مساعدات ----------
  d(k: string): any[] { return this.s.data[k] || []; }
  today(): string { return new Date().toISOString().slice(0, 10); }
  fmt(n: any): string { return Number(n || 0).toLocaleString('ar-EG'); }
  sum(a: any[], k: string): number { return a.reduce((t, x) => t + (+x[k] || 0), 0); }
  safe(url: string): SafeResourceUrl {
    if (!this.urls.has(url)) { this.urls.set(url, this.san.bypassSecurityTrustResourceUrl(url)); }
    return this.urls.get(url) as SafeResourceUrl;
  }

  // ---------- الدخول ----------
  get me(): any { return this.d('users').find(u => u.id === this.s.sid && u.status !== 'منتهي'); }
  async doSetup(): Promise<void> {
    const u = this.su;
    if (!u.name || !u.email || !u.pass) { this.err = 'املأ الاسم والإيميل وكلمة المرور'; return; }
    this.s.save('users', { name: u.name, email: u.email.trim().toLowerCase(), phone: u.phone.trim(), pass: await this.s.hash(u.pass),
      role: MGR, status: 'يعمل', start: this.today(), wage: 0 });
    this.err = '';
  }
  async doLogin(): Promise<void> {
    const id = this.lg.id.trim().toLowerCase(), h = await this.s.hash(this.lg.pw);
    const u = this.d('users').find(x => x.status !== 'منتهي' && x.pass === h &&
      (String(x.email || '').toLowerCase() === id || String(x.phone || '') === id));
    if (!u) { this.err = 'بيانات الدخول غير صحيحة'; return; }
    if (u.role === MGR && String(u.email || '').toLowerCase() !== id) { this.err = 'المدير يدخل بالإيميل فقط'; return; }
    this.err = ''; this.lg = { id: '', pw: '' }; this.cur = 'home'; this.s.setSession(u.id);
  }
  logout(): void { this.s.setSession(null); }

  // ---------- الصلاحيات ----------
  can(k: string, p: string): boolean {
    const me = this.me;
    if (!me) { return false; }
    if (me.role === MGR) { return true; }
    return (this.s.perms[k]?.[me.role] ?? M[k].p?.[me.role] ?? '').includes(p);
  }
  has(k: string, r: string, p: string): boolean { return (this.s.perms[k]?.[r] ?? M[k].p?.[r] ?? '').includes(p); }
  toggle(k: string, r: string, p: string): void {
    const c = this.s.perms[k]?.[r] ?? M[k].p?.[r] ?? '';
    const n = c.includes(p) ? c.replace(p, '') : c + p;
    this.s.perms[k] = { ...(this.s.perms[k] || {}), [r]: n };
    this.s.savePerms();
  }
  get tabs(): { k: string; t: string }[] {
    const t = this.keys.filter(k => this.can(k, 'r') || this.can(k, 'a')).map(k => ({ k, t: M[k].t }));
    return this.me?.role === MGR ? [...t, { k: 'payroll', t: 'المرتبات' }, { k: 'perms', t: 'الصلاحيات' }] : t;
  }

  // ---------- البيانات المرئية للمستخدم ----------
  v(k: string): any[] {
    let a = this.d(k);
    const me = this.me, m = M[k];
    if (!me || me.role === MGR) { return a; }
    if (m.scoped && me.role === WRK) { a = a.filter(x => x.house === me.house); }
    if (m.aud) { a = a.filter(x => x.by === me.name || (AUDV[x.to] || []).includes(me.role)); }
    if (k === 'users') { a = a.filter(x => x.role === WRK); }
    return a;
  }
  rows(k: string): any[] {
    const key = (r: any) => String(r.date || r.from || r.start || '');
    return [...this.v(k)].sort((a, b) => key(b).localeCompare(key(a)));
  }
  cols(k: string): Field[] { return M[k].f.filter(f => f.t !== 'password'); }
  options(f: Field): string[] {
    const me = this.me;
    if (f.o === '@aud') { return AUD[me.role] || []; }
    if (f.o === '@houses') {
      if (me.role === WRK) { return [me.house || '']; }
      const h = ['عنبر 1', 'عنبر 2', 'عنبر 3', 'عنبر 4'];
      this.d('users').forEach(u => { if (u.house && !h.includes(u.house)) { h.push(u.house); } });
      return h;
    }
    if (f.k === 'role' && this.edit?.k === 'users' && me.role !== MGR) { return [WRK]; }
    if (me.role === WRK && f.wo) { return f.wo; }
    return Array.isArray(f.o) ? f.o : this.d(f.o as string).map(x => x.name);
  }

  // ---------- الرئيسية ----------
  get active(): any { return this.d('cycles').filter(c => c.status === 'جارية').slice(-1)[0]; }
  get dead(): number {
    const a = this.active;
    return a ? this.sum(this.d('dead').filter(x => x.cyc === a.name), 'n') : 0;
  }
  deadToday(): number { return this.sum(this.v('dead').filter(x => x.date === this.today()), 'n'); }
  feed(type: string, onlyToday = false): number {
    return this.sum(this.v('feed').filter(x => x.type === type && (!onlyToday || x.date === this.today())), 'qty');
  }
  since(k: string, type?: string): number {
    const s = this.active?.start || '';
    return this.sum(this.d(k).filter(x => x.date >= s && (!type || x.type === type)), 'qty');
  }
  get meds(): { n: string; q: number }[] {
    const st: Record<string, number> = {};
    for (const x of this.d('meds')) { st[x.name] = (st[x.name] || 0) + (x.type === 'وارد' ? 1 : -1) * (+x.qty || 0); }
    return Object.keys(st).map(n => ({ n, q: st[n] }));
  }
  cnt(role: string): number { return this.d('users').filter(x => x.role === role && x.status !== 'منتهي').length; }
  get pendingLeaves(): number { return this.d('leave').filter(x => x.st === 'معلقة').length; }
  get todayMeals(): any[] { return this.d('meals').filter(x => x.date === this.today()); }

  // ---------- المرتبات ----------
  calc(u: any, month?: string): any {
    const inM = (x: any) => !month || String(x.date || x.from || '').startsWith(month);
    const att = (st: string) => this.d('attendance').filter(a => a.emp === u.name && a.st === st && inM(a)).length;
    const days = att('حضور'), leaves = att('إجازة'), absent = att('غياب');
    const ded = this.sum(this.d('deduct').filter(a => a.emp === u.name && inM(a)), 'amt');
    const adv = this.sum(this.d('adv').filter(a => a.emp === u.name && inM(a)), 'amt');
    const gross = days * (+u.wage || 0);
    return { days, leaves, absent, ded, adv, gross, net: gross - ded - adv };
  }
  get payrollRows(): any[] {
    return this.d('users').filter(u => u.status !== 'منتهي').map(u => ({ u, c: this.calc(u, this.pm) }));
  }
  mark(u: any, st: string): void {
    const t = this.today();
    if (this.d('attendance').some(a => a.emp === u.name && a.date === t)) { alert('تم تسجيل اليوم لـ ' + u.name); return; }
    this.s.save('attendance', { emp: u.name, date: t, st, by: this.me.name });
  }
  terminate(): void {
    const u = this.d('users').find(x => x.id === this.edit?.id);
    if (!u || !confirm('إنهاء خدمة ' + u.name + '؟')) { return; }
    const c = this.calc(u);
    alert(`${u.name}\nأيام الشغل: ${c.days}\nأيام الإجازة: ${c.leaves}\nأيام الغياب: ${c.absent}\nالخصومات: ${c.ded}\nالسلف: ${c.adv}\nالمرتب النهائي: ${c.net}`);
    this.s.save('users', { ...u, status: 'منتهي', end: this.today() });
    this.edit = null;
  }

  // ---------- النماذج ----------
  open(k: string, r?: any): void {
    const me = this.me;
    if (k === 'users' && me.role !== MGR && r && r.role !== WRK) { return; }
    this.edit = { k, id: r?.id };
    if (r) { this.form = { ...r, pass: '' }; return; }
    const o: any = {};
    for (const f of M[k].f) {
      o[f.k] = f.t === 'date' ? this.today() : f.t === 'number' ? 0 : f.t === 'select' ? (this.options(f)[0] ?? '') : '';
    }
    this.form = o;
  }
  pick(ev: any, key: string): void {
    const file = ev.target.files?.[0];
    if (!file) { return; }
    if (file.size > 500 * 1024) { alert('الصورة أكبر من 500 كيلو، صغّرها'); ev.target.value = ''; return; }
    const rd = new FileReader();
    rd.onload = () => { this.form[key] = rd.result; };
    rd.readAsDataURL(file);
  }
  async save(): Promise<void> {
    if (!this.edit) { return; }
    const k = this.edit.k, me = this.me, o: any = { ...this.form, id: this.edit.id };
    if (k === 'users') {
      if (me.role !== MGR) { o.role = WRK; }
      if (!o.name || (!o.email && !o.phone)) { alert('الاسم والإيميل أو التليفون مطلوبين'); return; }
      if (o.email) { o.email = String(o.email).trim().toLowerCase(); }
      if (o.pass) { o.pass = await this.s.hash(o.pass); }
      else {
        const old = this.d('users').find(x => x.id === o.id);
        if (!old) { alert('اكتب كلمة مرور'); return; }
        o.pass = old.pass;
      }
    }
    if (M[k].scoped && me.role === WRK) { o.house = me.house; }
    if (!o.id) { o.by = me.name; }
    this.s.save(k, o);
    this.edit = null;
  }
  remove(): void {
    if (this.edit?.id && this.can(this.edit.k, 'd') && confirm('حذف السجل؟')) { this.s.remove(this.edit.k, this.edit.id); this.edit = null; }
  }
}
