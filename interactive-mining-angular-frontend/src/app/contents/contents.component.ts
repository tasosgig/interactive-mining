import {Component, OnInit, ViewChildren} from '@angular/core';
import UIkit from 'uikit';
import {ActivatedRoute, Router} from '@angular/router';
import {Content} from './content';
import {ContentsService} from './contents.service';

@Component({
  selector: 'app-contents',
  templateUrl: './contents.component.html',
  styleUrls: ['./contents.component.css']
})
export class ContentComponent implements OnInit {

  public contentArray: Array<Content> = [];
  public selectedRow = -1;
  public selectedCollumn = 0;
  results = '';
  @ViewChildren('focusOnNew') focusOnNewInputs;

  constructor(private contentsService: ContentsService, private route: ActivatedRoute, private router: Router) { }

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
    UIkit.modal.confirm('<span class="uk-text-bold">' +
      'Are you sure you want to delete this content row?</span>', {escClose: true}).then(() => {
      this.contentArray.splice(index, 1);
      if (!this.contentArray.length) {
        this.addRow();
      }
    });
  }

  deleteAllFields() {
    UIkit.modal.confirm('<span class="uk-text-bold">' +
      'Are you sure you want to delete all your content?</span>', {escClose: true}).then(() => {
      this.contentArray.length = 0;
      this.addRow();
    });
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
              localStorage.setItem('concepts', contents.length.toString());
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
    this.contentsService.updateContent(this.contentArray)
      .subscribe(value => {
        localStorage.setItem('concepts', value);
        this.router.navigate(['../configure-profile'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
      });
  }

  promptToLeave(nextUrl: string): boolean {
    console.log(nextUrl);
    if (nextUrl.indexOf('upload-content') >= 0 || nextUrl.indexOf('configure-profile') >= 0 || nextUrl.indexOf('save-profile') >= 0) {
      return true;
    } else {
      return UIkit.modal.confirm('<span class="uk-text-bold">' +
        'Your changes have not been saved to your Profile!<br>Are you sure you want to leave?</span>', {escClose: true}).then(() => {
        return true;
      }, () => false);
    }
  }

}
