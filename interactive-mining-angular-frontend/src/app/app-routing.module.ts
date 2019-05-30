import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

export const AppRoutes: Routes = [
  { path: '', redirectTo: '/mining/manage-profiles?communityId=Egi', pathMatch: 'full' },
  { path: 'mining', loadChildren: './interactivemining/interactive-mining.module#InteractiveMiningModule'}
];

@NgModule({
  imports: [ RouterModule.forRoot(AppRoutes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
