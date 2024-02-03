import {Component, ElementRef, Inject, OnInit, ViewChild} from '@angular/core';
import {DOCUMENT, NgForOf} from "@angular/common";
import {HttpClientModule} from "@angular/common/http";
import {CurrencyService} from "../../service/currency.service";
import {Chart} from "chart.js";


@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [NgForOf, HttpClientModule],
  templateUrl: './rate.component.html',
  styleUrl: './rate.component.css'
})
export class RateComponent implements OnInit {



  public rates: any = [];

  canvas: any;
  ctx: any;

  constructor(readonly currencyService: CurrencyService, @Inject(DOCUMENT) private document: Document) {
    this.canvas = this.document.getElementById('rateChart');

    if(this.canvas){

      this.ctx = this.canvas.getContext('2d');
    }
  }

  ngOnInit(): void {

    this.currencyService.getExchangeRate().subscribe((response: any) => {
      const data = response.toString().replace(/\s+/g, '').trim();
      this.rates = this.extractData(data);
      this.loadChart();
    });

  }

  loadChart(){

    let label = [];
    let buys = [];
    let sells = [];

    for(let i=0; i<this.rates.length; i++){

      label.push(this.rates[i][0]);
      buys.push(this.rates[i][1]);
      sells.push(this.rates[i][2]);
    }

    new Chart(this.canvas, {
      type: 'bar',
      data: {
        labels: label,
        datasets: [{
          label: '# Currency',
          data: buys,
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
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
