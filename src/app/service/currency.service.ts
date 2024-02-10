import { Injectable } from '@angular/core';
import {catchError, Observable, of, retry, throwError} from "rxjs";
import {HttpClient, HttpErrorResponse} from "@angular/common/http";
import {tap} from "rxjs/operators";
import {CacheService} from "./cache.service";
import {data} from "jquery";

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {

  private url = "https://www.bb.org.bd/en/index.php/econdata/exchangerate";
  constructor(private http: HttpClient, private cacheService: CacheService) { }


  getExchangeRate(): Observable<any> {

    if(this.cacheService.isExist('rate') && this.cacheService.isValid('rate')){

      return of(this.cacheService.get("rate"));
    }

    return this.http.get(this.url, {responseType: "text"}).pipe(tap((data: any) => {

      this.cacheService.clear();
      this.cacheService.put("rate", data);

    }),
      retry(3),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 0) {
      console.error('An error occurred:', error.error);
    } else {
      console.error(
        `Backend returned code ${error.status}, body was: `, error.error);
    }
    return throwError(() => new Error('Something bad happened; please try again later.'));
  }
}
