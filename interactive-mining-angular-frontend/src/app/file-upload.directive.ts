import {Directive, EventEmitter, HostBinding, HostListener, Input, Output} from '@angular/core';

@Directive({
  selector: '[appDropFileUpload]'
})
export class FileUploadDirective {

  @Input() private allowedExtensions: Array<string> = [];
  @Input() private maxFileSize = 104857600;
  @Output() private filesChange: EventEmitter<File> = new EventEmitter();
  @Output() private filesInvalid: EventEmitter<File> = new EventEmitter();
  @HostBinding('class') private background = 'uk-placeholder cm-file-drop-area cm-coloured-text';

  constructor() { }

  @HostListener('dragover', ['$event']) public onDragOver(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = 'uk-placeholder cm-file-drop-area cm-coloured-text uk-dragover';
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = 'uk-placeholder cm-file-drop-area cm-coloured-text';
  }

  @HostListener('drop', ['$event']) public onDrop(evt) {
    evt.preventDefault();
    evt.stopPropagation();
    this.background = 'uk-placeholder cm-file-drop-area cm-coloured-text';
    let files: Array<File> = evt.dataTransfer.files;
    let valid_file: File = null;
    let invalid_file: File = null;
    if (files.length === 1) {
      let file = files[0];
      let ext = file.name.split('.')[file.name.split('.').length - 1];
      if (this.allowedExtensions.lastIndexOf(ext) !== -1 && file.size <= this.maxFileSize) {
        valid_file = file;
      } else {
        invalid_file = file;
      }
      this.filesChange.emit(valid_file);
      this.filesInvalid.emit(invalid_file);
    }
  }

}
