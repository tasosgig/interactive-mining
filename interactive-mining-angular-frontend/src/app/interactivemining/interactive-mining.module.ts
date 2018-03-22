import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigurationModule} from '../configuration/configuration.module';
import {ManageprofilesModule} from '../manageprofiles/manageprofiles.module';
import {SaveprofileModule} from '../saveprofile/saveprofile.module';
import {ContentModule} from '../contents/contents.module';
import {HttpClientModule} from '@angular/common/http';
import {InteractiveMiningRoutingModule} from './interactive-mining-routing.module';
import {InteractiveMiningComponent} from './interactive-mining.component';

@NgModule({
  imports: [
    CommonModule,
    InteractiveMiningRoutingModule,
    ManageprofilesModule,
    ContentModule,
    ConfigurationModule,
    SaveprofileModule,
    HttpClientModule
  ],
  declarations: [
    InteractiveMiningComponent
  ],
  exports: [
    InteractiveMiningComponent
  ]
})
export class InteractiveMiningModule {
}
