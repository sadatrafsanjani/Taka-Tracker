import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CacheService {

  private cache: Map<string, any> = new Map<string, [Date, any]>();

  constructor() {}

  put(key: string, value: any) {

    const expiresIn = new Date();
    expiresIn.setMinutes(expiresIn.getMinutes() + 5);

    this.cache.set(key, [expiresIn, value]);
  }

  get(key: string): any {

    return this.cache.get(key)[1];
  }

  isExist(key: string): any {
    return this.cache.get(key) !== undefined;
  }

  isValid(key: string): any {

    const time = this.cache.get(key)[0] as Date;

    return time.getTime() > new Date().getTime();
  }

  clear() {
    this.cache.clear();
  }
}
