import {Component, OnInit} from '@angular/core';
import {NgClass} from "@angular/common";
import {CurrencyService} from "../../service/currency.service";
import {TimeService} from "../../service/time.service";
import {RateDTO} from "../dto/RateDTO";
import * as cheerio from 'cheerio';


@Component({
  selector: 'app-rate',
  standalone: true,
  imports: [NgClass],
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

    const $ = cheerio.load(html);
    const result: string[][] = [];

    $('table').each((_, table) => {
      $(table).find('tr').each((_, row) => {

        const cells: string[] = [];

        $(row).find('th, td').each((_, cell) => {
          cells.push($(cell).text().trim());
        });

        if (cells.some(cell => cell !== '')) {
          result.push(cells);
        }
      });
    });

    const data = result
      .filter(row => row.length > 0)
      .filter((_, index) => index !== 0 && index !== 2);

    const json: RateDTO[] = data.map(row => ({
      currency: row[0],
      buy: row[1],
      sell: row[2]
    }));

    return json;
  }
}
