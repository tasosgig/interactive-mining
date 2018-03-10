import {NgModule} from '@angular/core';

import {AppComponent} from './app.component';
import {InteractiveMiningModule} from './interactivemining/interactivemining.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    InteractiveMiningModule
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
}
