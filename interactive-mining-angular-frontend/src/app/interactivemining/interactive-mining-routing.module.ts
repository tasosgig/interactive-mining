import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SaveprofileComponent} from '../saveprofile/saveprofile.component';
import {ConfigurationComponent} from '../configuration/configuration.component';
import {ContentComponent} from '../contents/contents.component';
import {ManageprofilesComponent} from '../manageprofiles/manageprofiles.component';
import {InteractiveMiningComponent} from './interactive-mining.component';

const interactiveMiningRoutes: Routes = [
  {
    path: 'mining',
    component: InteractiveMiningComponent,
    children: [
      { path: 'manage-profiles', component: ManageprofilesComponent },
      { path: 'upload-content', component: ContentComponent },
      { path: 'configure-profile', component: ConfigurationComponent },
      { path: 'save-profile', component: SaveprofileComponent }
    ]
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(interactiveMiningRoutes)
  ],
  exports: [
    RouterModule
  ]
})
export class InteractiveMiningRoutingModule { }
