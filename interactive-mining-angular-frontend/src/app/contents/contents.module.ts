import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ContentstableComponent } from './contentstable/contentstable.component';
import { ContentComponent } from './contents.component';
import {ContentsService} from './contents.service';
import { TextareaAutosizeModule } from 'ngx-textarea-autosize';
import {FileUploadDirective} from '../file-upload.directive';

@NgModule({
  exports: [
    ContentComponent
  ],
  providers: [
    ContentsService
  ],
  imports: [
    CommonModule,
    FormsModule,
    TextareaAutosizeModule
  ],
  declarations: [
    ContentstableComponent,
    ContentComponent,
    FileUploadDirective
  ]
})
export class ContentModule { }
