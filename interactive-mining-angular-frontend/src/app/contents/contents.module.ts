import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContentstableComponent } from './contentstable/contentstable.component';
import { ContentComponent } from './contents.component';
import {ContentsService} from './contents.service';
import {FileUploadDirective} from '../file-upload.directive';
import {AutosizeDirective} from './autosize.directive';

@NgModule({
  exports: [
    ContentComponent
  ],
  providers: [
    ContentsService
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  declarations: [
    ContentstableComponent,
    ContentComponent,
    FileUploadDirective,
    AutosizeDirective
  ]
})
export class ContentModule { }
