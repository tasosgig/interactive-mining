import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {ContentComponent} from './contents/contents.component';
import {ConfigurationComponent} from './configuration/configuration.component';
import {SaveprofileComponent} from './saveprofile/saveprofile.component';
import {ManageprofilesComponent} from './manageprofiles/manageprofiles.component';

export const InteractiveMiningRoutes: Routes = [
  { path: '', redirectTo: '/manage-profiles', pathMatch: 'full' },
  { path: 'manage-profiles', component: ManageprofilesComponent },
  { path: 'upload-content', component: ContentComponent },
  { path: 'configure-profile', component: ConfigurationComponent },
  { path: 'save-profile', component: SaveprofileComponent }
];

@NgModule({
  imports: [ RouterModule.forRoot(InteractiveMiningRoutes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule { }
