import {Component, OnInit} from '@angular/core';
import {NgClass, NgForOf, NgIf} from "@angular/common";
import {HttpClientModule} from "@angular/common/http";
import {CurrencyService} from "../../service/currency.service";
import {TimeService} from "../../service/time.service";
import {RateDTO} from "../dto/RateDTO";


@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [NgForOf, HttpClientModule, NgIf, NgClass],
  templateUrl: './rate.component.html',
  styleUrl: './rate.component.css'
})
export class RateComponent implements OnInit {

  rates: RateDTO[] = [];
  errorMessage!: string;

  constructor(private currencyService: CurrencyService, private timeService: TimeService) {
  }

  ngOnInit(): void {

    this.getData();
  }

  public getData(){

    this.currencyService.getExchangeRate().subscribe({
      next: (response: any) => {
        this.rates = this.extractData(response.toString().replace(/\s+/g, '').trim());
      },
      error: (err) => {
        this.errorMessage = err;
      },
      complete: () => {
        const date = new Date();
        const updatedAt = date.getHours() + ":" + date.getMinutes();
        this.timeService.setTime(updatedAt);
      }
    });
  }

  private extractData(html: string){

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const tables = doc.querySelectorAll("table");

    const result = Array.from(tables).flatMap(table => {

      return Array.from(table.querySelectorAll("tr")).map(row =>

        Array.from(row.querySelectorAll("th, td")).map(cell =>
          cell.textContent?.trim() ?? ""
        )
      );
    }).filter(row => row.length > 0).filter((_, index) => index !== 0 && index !== 2);

    const json: RateDTO[] = result.map(row => ({
      currency: row[0],
      buy: row[1],
      sell: row[2]
    }));

    return json;
  }
}
