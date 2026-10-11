import { Injectable } from '@angular/core';
import { M } from './config';

// التخزين حالياً في المتصفح (localStorage) للتجربة فقط.
// للاستخدام الحقيقي (تسجيل دخول آمن + رسائل SMS) لازم سيرفر/Firebase.
@Injectable({ providedIn: 'root' })
export class StoreService {
  data: Record<string, any[]> = {};
  perms: Record<string, Record<string, string>> = {};
  sid: string | null = null;

  constructor() {
    for (const k of Object.keys(M)) { this.data[k] = this.load('farm_' + k, []); }
    this.perms = this.load('farm_perms', {});
    this.sid = localStorage.getItem('farm_sid');
  }

  private load(key: string, def: any): any {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? def; } catch { return def; }
  }
  private put(key: string, v: any): void {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { alert('مساحة التخزين ممتلئة (قلل حجم الصور)'); }
  }

  save(k: string, r: any): void {
    const id = r.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const n = { ...r, id };
    const i = this.data[k].findIndex(x => x.id === id);
    if (i >= 0) { this.data[k][i] = n; } else { this.data[k].push(n); }
    this.put('farm_' + k, this.data[k]);
  }
  remove(k: string, id: string): void {
    this.data[k] = this.data[k].filter(x => x.id !== id);
    this.put('farm_' + k, this.data[k]);
  }
  savePerms(): void { this.put('farm_perms', this.perms); }
  setSession(id: string | null): void {
    this.sid = id;
    if (id) { localStorage.setItem('farm_sid', id); } else { localStorage.removeItem('farm_sid'); }
  }
  async hash(t: string): Promise<string> {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('farm:' + t));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  }
}
