import { NgModule } from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SaveprofileComponent} from '../saveprofile/saveprofile.component';
import {ConfigurationComponent} from '../configuration/configuration.component';
import {ContentComponent} from '../contents/contents.component';
import {ManageprofilesComponent} from '../manageprofiles/manageprofiles.component';
import {InteractiveMiningComponent} from './interactive-mining.component';
import {SaveProfileGuard, UploadContentGuard} from './save-profile-guard';

const interactiveMiningRoutes: Routes = [
  {path: '', redirectTo: '/mining/manage-profiles', pathMatch: 'full'},
  {
    path: '',
    // component: InteractiveMiningComponent,
    children: [
      { path: 'manage-profiles', component: ManageprofilesComponent },
      { path: 'upload-content',
        component: ContentComponent,
        canDeactivate: [UploadContentGuard]
      },
      { path: 'configure-profile',
        component: ConfigurationComponent,
        canDeactivate: [SaveProfileGuard]
      },
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
  ],
  providers: [
    UploadContentGuard,
    SaveProfileGuard
  ]
})
export class InteractiveMiningRoutingModule { }
