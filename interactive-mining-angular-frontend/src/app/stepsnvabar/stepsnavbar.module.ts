import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {StepsnvabarComponent} from './stepsnvabar.component';
import {RouterModule} from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    RouterModule
  ],
  exports: [
    StepsnvabarComponent
  ],
  declarations: [
    StepsnvabarComponent
  ]
})
export class StepsnavbarModule { }
