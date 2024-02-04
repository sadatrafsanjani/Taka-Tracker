import { Injectable } from '@angular/core';
import {BehaviorSubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class TimeService {

  private time = new BehaviorSubject("");
  getTime = this.time.asObservable();
  constructor() { }

  setTime(time: string){
    this.time.next(time);
  }
}
