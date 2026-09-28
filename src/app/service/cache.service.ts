import { Injectable } from '@angular/core';

@Injectable({providedIn: 'root'})
export class CacheService {

  private cache = new Map<string, [Date, any]>();

  put(key: string, value: any): void {
    const expiresIn = new Date();
    expiresIn.setMinutes(expiresIn.getMinutes() + 5);

    this.cache.set(key, [expiresIn, value]);
  }

  get(key: string): any {
    return this.cache.get(key)?.[1];
  }

  isExist(key: string): boolean {
    return this.cache.has(key);
  }

  isValid(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    return entry[0].getTime() > Date.now();
  }

  clear(): void {
    this.cache.clear();
  }
}
