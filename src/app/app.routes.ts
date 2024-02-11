import { Routes } from '@angular/router';
import {IndexComponent} from "./component/index/index.component";

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: IndexComponent }
];
