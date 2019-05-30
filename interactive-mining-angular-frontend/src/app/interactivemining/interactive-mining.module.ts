import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {ConfigurationModule} from '../configuration/configuration.module';
import {ManageprofilesModule} from '../manageprofiles/manageprofiles.module';
import {SaveprofileModule} from '../saveprofile/saveprofile.module';
import {ContentModule} from '../contents/contents.module';
import {HttpClientModule} from '@angular/common/http';

@NgModule({
  imports: [
    CommonModule,
    ManageprofilesModule,
    ContentModule,
    ConfigurationModule,
    SaveprofileModule,
    HttpClientModule
  ]
})
export class InteractiveMiningModule {
}
