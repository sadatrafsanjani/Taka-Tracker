import {Component} from '@angular/core';
import {RateComponent} from "../rate/rate.component";
import {TimeService} from "../../service/time.service";

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [
    RateComponent
  ],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {

  time!: string;

  constructor(private timeService: TimeService) {
    this.getTime();
  }

  getYear(){

    return new Date().getFullYear();
  }

  getTime() {
    this.timeService.getTime.subscribe((time: string) => {
      this.time = time;
    });
  }
}
