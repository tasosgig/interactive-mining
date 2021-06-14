import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const AppRoutes: Routes = [
  { path: '', redirectTo: '/mining/manage-profiles?communityId=Egi', pathMatch: 'full' },
  { path: 'mining', loadChildren: () => import('./lazy-mining.module').then(m => m.LazyMiningModule)}
];

@NgModule({
  imports: [ RouterModule.forRoot(AppRoutes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
