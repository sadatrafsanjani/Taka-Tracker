import { Component } from '@angular/core';
import {TimeService} from "../../service/time.service";

@Component({
  selector: 'app-info',
  standalone: true,
  imports: [],
  templateUrl: './info.component.html',
  styleUrl: './info.component.css'
})
export class InfoComponent {

  title: string = 'Taka Tracker';
  time!: string;

  constructor(private timeService: TimeService) {
    this.getTime();
  }

  getTime() {
    this.timeService.getTime.subscribe((time: string) => {
      this.time = time;
    });
  }
  getYear(){

    return new Date().getFullYear();
  }
}
