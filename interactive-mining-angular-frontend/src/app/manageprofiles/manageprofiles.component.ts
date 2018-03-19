import {Component, OnInit} from '@angular/core';
import {ManageprofilesService} from './manageprofiles.service';
import {ActivatedRoute, Router} from '@angular/router';
import UIkit from 'uikit';
import {PaginationInstance} from 'ngx-pagination';
import {ProfileMetadata} from './profile-metadata';
import {ExampleProfilesMetadata} from './example-profiles-metadata';
import {saveFile} from '../util';

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

  constructor(private manageProfilesService: ManageprofilesService, private route: ActivatedRoute, private router: Router) {
  }

  ngOnInit() {
    this.initialServerhandshake();
  }

  initialServerhandshake(): void {
    this.manageProfilesService.initialServerHandshake()
      .subscribe(() => {
        this.getSavedProfiles();
        this.getExampleProfiles();
      });
  }

  getSavedProfiles(): void {
    this.manageProfilesService.getSavedProfiles()
      .subscribe(res => {
        if (res) {
          this.userSavedProfiles = res;
        }
      });
  }

  loadSavedProfile(id: string, name: string): void {
    this.manageProfilesService.loadSavedProfile(id)
      .subscribe(res => {
        console.log(res);
        // clear localstorage values
        this.clearLocalStorage();
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
        this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
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
    // clear localstorage values
    this.clearLocalStorage();
    this.manageProfilesService.createNewProfile()
      .subscribe(() => this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'}));
  }

  fileChangeUpload(event): void {
    // clear localstorage values
    this.clearLocalStorage();
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
          this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
        });
    }
  }

  getExampleProfiles(): void {
    this.manageProfilesService.getExampleProfiles()
      .subscribe(res => this.exampleProfiles = res);
  }

  loadExampleProfile(name: string): void {
    // clear localstorage values
    this.clearLocalStorage();
    // get new profile data
    this.manageProfilesService.loadExampleProfile(name)
      .subscribe(res => {
        console.log(res);
        localStorage.setItem('precision', res.precision);
        localStorage.setItem('concepts', res.concepts);
        localStorage.setItem('docname', res.docname);
        localStorage.setItem('docsnumber', res.docsnumber);
        localStorage.setItem('poswords', JSON.stringify(res.poswords));
        localStorage.setItem('negwords', JSON.stringify(res.negwords));
        localStorage.setItem('contextprev', res.contextprev);
        localStorage.setItem('contextmiddle', res.contextmiddle);
        localStorage.setItem('contextnext', res.contextnext);
        localStorage.setItem('wordssplitnum', res.wordssplitnum);
        localStorage.setItem('punctuation', res.punctuation);
        localStorage.setItem('stopwords', res.stopwords);
        localStorage.setItem('lettercase', res.lettercase);
        this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
      });
  }

  clearLocalStorage(): void {
    // clear localstorage values
    localStorage.removeItem('grants');
    localStorage.removeItem('profilename');
    localStorage.removeItem('profileid');
    localStorage.removeItem('docname');
    localStorage.removeItem('docsnumber');
    localStorage.removeItem('precision');
    localStorage.removeItem('concepts');
    localStorage.removeItem('poswords');
    localStorage.removeItem('negwords');
    localStorage.removeItem('contextprev');
    localStorage.removeItem('contextmiddle');
    localStorage.removeItem('contextnext');
    localStorage.removeItem('wordssplitnum');
    localStorage.removeItem('punctuation');
    localStorage.removeItem('stopwords');
    localStorage.removeItem('lettercase');
  }

}
