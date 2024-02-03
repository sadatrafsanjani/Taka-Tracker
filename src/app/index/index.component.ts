import {Component} from '@angular/core';
import {NavComponent} from "../template/nav/nav.component";
import {FooterComponent} from "../template/footer/footer.component";
import {RateComponent} from "../template/rate/rate.component";


@Component({
  selector: 'app-index',
  standalone: true,
  imports: [NavComponent, FooterComponent, RateComponent],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexComponent {


}
