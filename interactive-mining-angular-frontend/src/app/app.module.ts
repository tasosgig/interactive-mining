import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppComponent } from './app.component';
import { CookieService } from 'ngx-cookie-service';
import { ContentModule } from './contents/contents.module';
import { AppRoutingModule } from './app-routing.module';
import { StepsnvabarComponent } from './stepsnvabar/stepsnvabar.component';
import {ConfigurationModule} from './configuration/configuration.module';
import {SaveprofileModule} from './saveprofile/saveprofile.module';
import {ManagprofilesModule} from './manageprofiles/manageprofiles.module';
import {HttpModule} from '@angular/http';

@NgModule({
  declarations: [
    AppComponent,
    StepsnvabarComponent
  ],
  imports: [
    BrowserModule,
    ManagprofilesModule,
    ContentModule,
    ConfigurationModule,
    SaveprofileModule,
    HttpClientModule,
    HttpModule,
    AppRoutingModule
  ],
  providers: [CookieService],
  bootstrap: [AppComponent]
})
export class AppModule { }
