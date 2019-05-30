import {NgModule} from '@angular/core';
import {InteractiveMiningRoutingModule} from './interactivemining/interactive-mining-routing.module';
import {InteractiveMiningModule} from './interactivemining/interactive-mining.module';

@NgModule({
  imports: [
    InteractiveMiningModule,
    InteractiveMiningRoutingModule
  ]
})
export class LazyMiningModule {
}
