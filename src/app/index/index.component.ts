import {Component, OnInit} from '@angular/core';
import {CurrencyService} from "../service/currency.service";
import {HttpClientModule} from "@angular/common/http";
import {NgForOf} from "@angular/common";


@Component({
  selector: 'app-index',
  standalone: true,
  imports: [HttpClientModule, NgForOf],
  templateUrl: './index.component.html',
  styleUrl: './index.component.css'
})
export class IndexComponent implements OnInit {

  rates: any = [];

  constructor(readonly currencyService: CurrencyService) {
  }

  ngOnInit(): void {

    this.currencyService.getExchangeRate().subscribe((response: any) => {
      const data = response.toString().replace(/\s+/g, '').trim();
      this.rates = this.extractData(data);
    });
  }

  extractData(table: string){

    let array: any = [];
    let data: any = [];
    let allData: any = [];

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

        const t = {
          currency: data[0],
          buy: data[1],
          sell: data[2]
        };

        allData.push(t);
        data = [];
      }
    }

    return allData;
  }
}
