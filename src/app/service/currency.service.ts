import { Injectable, TransferState, makeStateKey } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, retry, catchError, throwError, tap } from 'rxjs';
import { CacheService } from './cache.service';

const RATE_KEY = makeStateKey<string>('exchange-rate');

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {

  private URL = "https://www.bb.org.bd/en/index.php/econdata/exchangerate";

  constructor(
    private http: HttpClient,
    private cacheService: CacheService,
    private transferState: TransferState
  ) {}

  getExchangeRate(): Observable<any> {

    if (this.transferState.hasKey(RATE_KEY)) {
      const data = this.transferState.get(RATE_KEY, '');

      this.transferState.remove(RATE_KEY);

      this.cacheService.put('rate', data);

      return of(data);
    }


    if (this.cacheService.isExist('rate') && this.cacheService.isValid('rate')) {
      return of(this.cacheService.get('rate'));
    }

    return this.http.get(this.URL, { responseType: 'text' }).pipe(
      tap((data: string) => {

        this.cacheService.put('rate', data);

        // SSR → Browser
        this.transferState.set(RATE_KEY, data);

      }),
      retry(3),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {

    let message = '';

    if (error.status === 0) {
      message = 'Network connection problem!';
    } else {
      message =
        'Error code: ' +
        error.status +
        ' Message: ' +
        error.error;
    }

    return throwError(() => new Error(message));
  }
}
