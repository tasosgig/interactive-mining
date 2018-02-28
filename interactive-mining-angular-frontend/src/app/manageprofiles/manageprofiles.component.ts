import { Component, OnInit } from '@angular/core';
import {ManageprofilesService} from './manageprofiles.service';
import {Router} from '@angular/router';
import UIkit from 'uikit';
import {CookieService} from 'ngx-cookie-service';
import {PaginationInstance} from 'ngx-pagination';
import {ProfileMetadata} from './profile-metadata';
import {ExampleProfilesMetadata} from './example-profiles-metadata';
import {getFileNameFromResponseContentDisposition, saveFile} from '../util';

@Component({
  selector: 'app-manageprofiles',
  templateUrl: './manageprofiles.component.html',
  styleUrls: ['./manageprofiles.component.css']
})
export class ManageprofilesComponent implements OnInit {

  // TODO profile table sorting: https://ciphertrick.com/2017/08/01/search-sort-pagination-in-angular/

  public userSavedProfiles: Array<ProfileMetadata> = [];
  public exampleProfiles: Array<ExampleProfilesMetadata> = [];

  public config: PaginationInstance = {
    id: 'custom',
    itemsPerPage: 5,
    currentPage: 1
  };

  constructor(private manageProfilesService: ManageprofilesService, private router: Router, private cookieService: CookieService) { }

  ngOnInit() {
    this.getUserId();
  }

  getUserId(): void {
    this.manageProfilesService.getUserIdToLocalStorage()
      .subscribe(() => {
        localStorage.setItem('user_id', this.cookieService.get('madgikmining'));
        this.getSavedProfiles();
        this.getExampleProfiles();
      });
  }

  getSavedProfiles(): void {
    this.manageProfilesService.getSavedProfiles()
      .subscribe(res => this.userSavedProfiles = res);
  }

  loadSavedProfile(id: string, name: string): void {
    this.manageProfilesService.loadSavedProfile(id)
      .subscribe(res => {
          console.log(res);
          // backup user_id from localstorage and clear all storage data
          const userId: string = localStorage.getItem('user_id');
          localStorage.clear();
          localStorage.setItem('user_id', userId);
          // store to client all profile data
          localStorage.setItem('profilename', name);
          localStorage.setItem('profileid', id);
          localStorage.setItem('docname', res.docname);
          localStorage.setItem('docsnumber', res.docsnumber);
          localStorage.setItem('precision', res.precision);
          localStorage.setItem('concepts', res.concepts);
          localStorage.setItem('poswords', JSON.stringify(res.poswords));
          localStorage.setItem('negwords', JSON.stringify(res.negwords));
          localStorage.setItem('contextprev', res.contextprev);
          localStorage.setItem('contextmiddle', res.contextmiddle);
          localStorage.setItem('contextnext', res.contextnext);
          localStorage.setItem('wordssplitnum', res.wordssplitnum);
          localStorage.setItem('punctuation', res.punctuation);
          localStorage.setItem('stopwords', res.stopwords);
          localStorage.setItem('lettercase', res.lettercase);
          this.router.navigate(['/upload-content']);
      });
  }

  downloadProfile(profileId: string, profileName: string): void {
    this.manageProfilesService.downloadProfile(profileId)
      .subscribe(res => {
        saveFile(res, profileName.replace(/ /g, '_') + '.oamp');
      });
  }

  deleteProfilePrompt(index) {
    UIkit.modal.confirm('<span class="uk-text-bold uk-text-danger">' +
      'Are you sure you want to delete this profile? This action cannot be undone!</span>', {escClose: true}).then(() => {
        this.manageProfilesService.deleteProfile(this.userSavedProfiles[index].id)
          .subscribe(() => this.userSavedProfiles.splice(index, 1));
    });
  }

  createNewProfile(): void {
    // backup user_id from localstorage and clear all storage data
    const userId: string = localStorage.getItem('user_id');
    localStorage.clear();
    localStorage.setItem('user_id', userId);
    this.manageProfilesService.createNewProfile()
      .subscribe(() => this.router.navigate(['/upload-content']));
  }

  fileChangeUpload(event): void {
    // backup user_id from localstorage and clear all storage data
    const userId: string = localStorage.getItem('user_id');
    localStorage.clear();
    localStorage.setItem('user_id', userId);
    const fileList: FileList = event.target.files;
    if (fileList && fileList.length === 1) {
      const file: File = fileList[0];
      // get new profile data
      this.manageProfilesService.uploadFile(file)
        .subscribe(res => {
          console.log(res);
          localStorage.setItem('precision', res.precision);
          localStorage.setItem('concepts', res.concepts);
          localStorage.setItem('poswords', JSON.stringify(res.poswords));
          localStorage.setItem('negwords', JSON.stringify(res.negwords));
          localStorage.setItem('contextprev', res.contextprev);
          localStorage.setItem('contextmiddle', res.contextmiddle);
          localStorage.setItem('contextnext', res.contextnext);
          localStorage.setItem('wordssplitnum', res.wordssplitnum);
          localStorage.setItem('punctuation', res.punctuation);
          localStorage.setItem('stopwords', res.stopwords);
          localStorage.setItem('lettercase', res.lettercase);
          this.router.navigate(['/upload-content']);
        });
    }
  }

  getExampleProfiles(): void {
    this.manageProfilesService.getExampleProfiles()
      .subscribe(res => this.exampleProfiles = res);
  }

  loadExampleProfile(name: string): void {
    // backup user_id from localstorage and clear all storage data
    const userId: string = localStorage.getItem('user_id');
    localStorage.clear();
    localStorage.setItem('user_id', userId);
    // get new profile data
    this.manageProfilesService.loadExampleProfile(name)
      .subscribe(res => {
        console.log(res);
        localStorage.setItem('precision', res.precision);
        localStorage.setItem('concepts', res.concepts);
        localStorage.setItem('poswords', JSON.stringify(res.poswords));
        localStorage.setItem('negwords', JSON.stringify(res.negwords));
        localStorage.setItem('contextprev', res.contextprev);
        localStorage.setItem('contextmiddle', res.contextmiddle);
        localStorage.setItem('contextnext', res.contextnext);
        localStorage.setItem('wordssplitnum', res.wordssplitnum);
        localStorage.setItem('punctuation', res.punctuation);
        localStorage.setItem('stopwords', res.stopwords);
        localStorage.setItem('lettercase', res.lettercase);
        this.router.navigate(['/upload-content']);
      });
  }

}
