import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {InteractiveminingComponent} from './interactivemining.component';
import {ConfigurationModule} from '../configuration/configuration.module';
import {ManagprofilesModule} from '../manageprofiles/manageprofiles.module';
import {SaveprofileModule} from '../saveprofile/saveprofile.module';
import {BrowserModule} from '@angular/platform-browser';
import {ContentModule} from '../contents/contents.module';
import {AppRoutingModule} from '../app-routing.module';
import {HttpClientModule} from '@angular/common/http';
import {StepsnvabarComponent} from '../stepsnvabar/stepsnvabar.component';

@NgModule({
  imports: [
    CommonModule,
    BrowserModule,
    ManagprofilesModule,
    ContentModule,
    ConfigurationModule,
    SaveprofileModule,
    HttpClientModule,
    AppRoutingModule
  ],
  exports: [
    InteractiveminingComponent
  ],
  declarations: [
    InteractiveminingComponent,
    StepsnvabarComponent
  ]
})
export class InteractiveMiningModule {
}
