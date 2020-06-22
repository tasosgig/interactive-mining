import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {AppRoutingModule} from './app-routing.module';
import {BrowserModule} from '@angular/platform-browser';
import {InteractiveMiningModule} from './interactivemining/interactive-mining.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    InteractiveMiningModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
