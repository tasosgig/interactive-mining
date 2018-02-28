import {Component, OnInit, ViewChildren} from '@angular/core';
import { Content } from '../content';
import {ContentsService} from '../contents.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-contentstable',
  templateUrl: './contentstable.component.html',
  styleUrls: ['./contentstable.component.css']
})
export class ContentstableComponent implements OnInit {

  public contentArray: Array<Content> = [];
  public selectedRow = -1;
  public selectedCollumn = 0;
  results = '';
  @ViewChildren('focusOnNew') focusOnNewInputs;

  constructor(private contentsService: ContentsService, private router: Router) { }

  ngOnInit() {
    this.getContent();
  }

  getContent(): void {
    this.contentsService.getContent()
      .subscribe(contents => {
        this.contentArray = contents;
        if (!this.contentArray.length) {
          this.addRow();
        }
      });
  }

  selectRowColumn(row, column) {
    this.selectedRow = row;
    this.selectedCollumn = column;
  }

  unselectRow() {
    this.selectedRow = -1;
  }

  addRow(): void {
    const content = new Content();
    content.keyword = '';
    content.context = '';
    this.contentArray.push(content);
    setTimeout( () => {
      this.focusOnNewInputs.toArray()[this.contentArray.length - 1].nativeElement.focus();
    }, 100);
  }

  isAnyContent(): boolean {
    let checked = false;
    this.contentArray.forEach(function(element) {
      if (element.keyword !== '') {
        checked = true;
        return;
      }
    });
    return checked;
  }

  deleteFieldValue(index) {
    this.contentArray.splice(index, 1);
    if (!this.contentArray.length) {
      this.addRow();
    }
  }

  onFilesChange(file: File) {
    if (file !== null && file !== undefined) {
      console.log(file);
      let ext = file.name.split('.')[file.name.split('.').length - 1];
      let allowedExtensions = ['tsv', 'txt'];
      if (allowedExtensions.lastIndexOf(ext) !== -1 && file.size <= 51200) {
        this.contentsService.uploadFile(file)
          .subscribe(contents => {
            if (contents.length !== 0) {
              this.contentArray = contents;
            }
          });
      } else {
        this.onFileInvalid(file);
      }
    }
  }

  onFileInvalid(file: File) {
    if (file !== null && file !== undefined) {
      console.log('ERROR', file);
    }
  }

  saveAndContinue(): void {
    this.contentsService.updateContent(this.contentArray).subscribe(value => this.router.navigate(['/configure-profile']));
  }

}
