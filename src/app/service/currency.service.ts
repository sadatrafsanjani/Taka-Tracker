import { Injectable } from '@angular/core';
import {Observable} from "rxjs";
import {HttpClient, HttpHeaders, HttpResponse} from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class CurrencyService {

  private url = "https://www.bb.org.bd/en/index.php/econdata/exchangerate";
  constructor(private http: HttpClient) { }

  getExchangeRate(): Observable<any> {

    return this.http.get(this.url, {responseType: "text"});
  }
}
