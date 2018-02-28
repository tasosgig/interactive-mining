import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ManageprofilesComponent } from './manageprofiles.component';
import { NgxPaginationModule } from 'ngx-pagination';
import { ManageprofilesService } from './manageprofiles.service';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    NgxPaginationModule
  ],
  exports: [
    ManageprofilesComponent
  ],
  providers: [
    ManageprofilesService
  ],
  declarations: [ManageprofilesComponent]
})
export class ManagprofilesModule { }
