import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ConfigurationComponent } from './configuration.component';
import { SettingsComponent } from './settings/settings.component';
import { ResultspreviewComponent } from './resultspreview/resultspreview.component';
import {ConfigurationService} from './configuration.service';
import {StepsnavbarModule} from '../stepsnvabar/stepsnavbar.module';
import { NouisliderModule } from 'ng2-nouislider';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    StepsnavbarModule,
    NouisliderModule
  ],
  exports: [
    ConfigurationComponent
  ],
  providers: [
    ConfigurationService
  ],
  declarations: [ConfigurationComponent, SettingsComponent, ResultspreviewComponent]
})
export class ConfigurationModule { }
