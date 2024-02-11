import {Component} from '@angular/core';
import {TimeService} from "../../service/time.service";
import {InfoComponent} from "../info/info.component";

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [InfoComponent],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {

  title: string = 'Taka Tracker';
}
