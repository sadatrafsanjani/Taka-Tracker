import {Component, OnInit} from '@angular/core';
import {NgForOf, NgIf} from "@angular/common";
import {HttpClientModule} from "@angular/common/http";
import {CurrencyService} from "../../service/currency.service";
import {TimeService} from "../../service/time.service";


@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [
    NgForOf,
    HttpClientModule,
    NgIf],
  templateUrl: './rate.component.html',
  styleUrl: './rate.component.css'
})
export class RateComponent implements OnInit {

  rates: any = [];

  constructor(private currencyService: CurrencyService,
              private timeService: TimeService) {
  }

  ngOnInit(): void {

    this.currencyService.getExchangeRate().subscribe((response: any) => {
      if(response != null){

        const date = new Date();
        const updatedAt = date.getHours() + ":" + date.getMinutes();
        this.timeService.setTime(updatedAt);

        const data = response.toString().replace(/\s+/g, '').trim();
        this.extractData(data);
      }
    });
  }

  private extractData(table: string){

    let array: any = [];
    let data: any = [];

    let m: number | RegExpExecArray | null;
    const regex = /<td>(.*?)<\/td>/gm;

    while ((m = regex.exec(table)) !== null) {

      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      m.forEach((match, index) => {

        if(index%2){
          array.push(match);
        }
      })
    }

    for(let i=1; i<=array.length; i++){

      data.push(array[i-1]);

      if(i%3 == 0){

        const row = {
          currency: data[0],
          buy: data[1],
          sell: data[2]
        };

        this.rates.push(row);
        data = [];
      }
    }
  }

}
