import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SaveprofileComponent } from './saveprofile.component';
import {SaveprofileService} from './saveprofile.service';
import {StepsnavbarModule} from '../stepsnvabar/stepsnavbar.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    StepsnavbarModule
  ],
  exports: [
    SaveprofileComponent
  ],
  providers: [
    SaveprofileService
  ],
  declarations: [SaveprofileComponent]
})
export class SaveprofileModule { }
