import {Component, OnInit} from '@angular/core';
import {ManageprofilesService} from './manageprofiles.service';
import {ActivatedRoute, Router} from '@angular/router';
import UIkit from 'uikit';
import {PaginationInstance} from 'ngx-pagination';
import {ProfileMetadata} from './profile-metadata';
import {ExampleProfilesMetadata} from './example-profiles-metadata';
import {UsersMetadata} from './users-metadata';
import {saveFile} from '../util';

@Component({
  selector: 'app-manageprofiles',
  templateUrl: './manageprofiles.component.html'
})
export class ManageprofilesComponent implements OnInit {

  // TODO profile table sorting: https://ciphertrick.com/2017/08/01/search-sort-pagination-in-angular/

  public allUsersProfiles: Array<UsersMetadata> = [];
  public statusValues = [
    'Processing',
    'Evaluating',
    'On Beta'
  ];

  public communityId = '';
  public isCommunityManager = false;

  public userSavedProfiles: Array<ProfileMetadata> = [];
  public exampleProfiles: Array<ExampleProfilesMetadata> = [];

  public allProfiles: PaginationInstance = {
    id: 'all',
    itemsPerPage: 5,
    currentPage: 1
  };

  public userProfiles: PaginationInstance = {
    id: 'user',
    itemsPerPage: 5,
    currentPage: 1
  };

  public pending = false;

  constructor(private manageProfilesService: ManageprofilesService, private route: ActivatedRoute, private router: Router) {
  }

  ngOnInit() {
    this.route.queryParams
      .subscribe(
      params => {
        // console.log('queryParams', params['communityId']);
        this.communityId = params['communityId'];
        this.initialServerHandshake(this.communityId);
      });
    this.isCommunityManager = this.manageProfilesService.isCommunityManager === 'true';
  }

  private initialServerHandshake(communityId: string): void {
    this.manageProfilesService.initialServerHandshake(communityId)
      .subscribe(() => {
        if (this.isCommunityManager) {
          this.getAllUsersProfiles();
        }
        this.getSavedProfiles();
        this.getExampleProfiles();
      });
  }

  private getAllUsersProfiles(): void {
    this.manageProfilesService.getUsersProfiles()
      .subscribe(res => {
        if (res) {
          this.allUsersProfiles = res;
        }
      });
  }

  private getSavedProfiles(): void {
    this.manageProfilesService.getSavedProfiles()
      .subscribe(res => {
        if (res) {
          this.userSavedProfiles = res;
        }
      });
  }

  private getExampleProfiles(): void {
    this.manageProfilesService.getExampleProfiles()
      .subscribe(res => {
        console.log(res);
        this.exampleProfiles = res;
      });
  }

  private clearLocalStorage(): void {
    // clear localstorage values
    localStorage.removeItem('grants');
    localStorage.removeItem('profilename');
    localStorage.removeItem('profileid');
    localStorage.removeItem('docname');
    localStorage.removeItem('docsnumber');
    localStorage.removeItem('concepts');
    localStorage.removeItem('poswords');
    localStorage.removeItem('negwords');
    localStorage.removeItem('contextprev');
    localStorage.removeItem('contextmiddle');
    localStorage.removeItem('contextnext');
    localStorage.removeItem('wordssplitnum');
    localStorage.removeItem('punctuation');
    localStorage.removeItem('stopwords');
    localStorage.removeItem('lowercase');
    localStorage.removeItem('stemming');
    localStorage.removeItem('documentarea');
  }

  loadUserProfileAdmin(userId: string, profileId: string, name: string): void {
    this.manageProfilesService.loadUserProfileAdmin(userId, profileId)
      .subscribe(res => {
        // clear localstorage values
        this.clearLocalStorage();
        // store to client all profile data
        localStorage.setItem('docname', res.docname);
        localStorage.setItem('docsnumber', res.docsnumber);
        localStorage.setItem('concepts', res.concepts);
        localStorage.setItem('poswords', JSON.stringify(res.poswords));
        localStorage.setItem('negwords', JSON.stringify(res.negwords));
        localStorage.setItem('contextprev', res.contextprev);
        localStorage.setItem('contextmiddle', res.contextmiddle);
        localStorage.setItem('contextnext', res.contextnext);
        localStorage.setItem('wordssplitnum', res.wordssplitnum);
        localStorage.setItem('punctuation', res.punctuation);
        localStorage.setItem('stopwords', res.stopwords);
        localStorage.setItem('lowercase', res.lowercase);
        localStorage.setItem('stemming', res.stemming);
        localStorage.setItem('documentarea', res.documentarea);
        this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
      });
  }

  downloadUserProfileAdmin(userId: string, profileId: string, profileName: string): void {
    this.manageProfilesService.downloadUserProfileAdmin(userId, profileId)
      .subscribe(res => {
        saveFile(res, profileName.replace(/ /g, '_') + '.oamp');
      });
  }

  onStatusChange(userId: string, profileId: string, status: string): void {
    this.manageProfilesService.updateProfileStatus(userId, profileId, status)
      .subscribe();
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
        localStorage.setItem('concepts', res.concepts);
        localStorage.setItem('poswords', JSON.stringify(res.poswords));
        localStorage.setItem('negwords', JSON.stringify(res.negwords));
        localStorage.setItem('contextprev', res.contextprev);
        localStorage.setItem('contextmiddle', res.contextmiddle);
        localStorage.setItem('contextnext', res.contextnext);
        localStorage.setItem('wordssplitnum', res.wordssplitnum);
        localStorage.setItem('punctuation', res.punctuation);
        localStorage.setItem('stopwords', res.stopwords);
        localStorage.setItem('lowercase', res.lowercase);
        localStorage.setItem('stemming', res.stemming);
        localStorage.setItem('documentarea', res.documentarea);
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
          localStorage.setItem('concepts', res.concepts);
          localStorage.setItem('poswords', JSON.stringify(res.poswords));
          localStorage.setItem('negwords', JSON.stringify(res.negwords));
          localStorage.setItem('contextprev', res.contextprev);
          localStorage.setItem('contextmiddle', res.contextmiddle);
          localStorage.setItem('contextnext', res.contextnext);
          localStorage.setItem('wordssplitnum', res.wordssplitnum);
          localStorage.setItem('punctuation', res.punctuation);
          localStorage.setItem('stopwords', res.stopwords);
          localStorage.setItem('lowercase', res.lowercase);
          localStorage.setItem('stemming', res.stemming);
          localStorage.setItem('documentarea', res.documentarea);
          this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
        });
    }
  }


  notifyProfile(profile: ProfileMetadata ): void {
    UIkit.modal.confirm('<span class="uk-text-bold">' +
      'A notification will be sent to the OpenAIRE Mining experts, ' +
      'that your profile is in its final version!</br></br>' +
      'Are you sure you want to proceed?</span>', {escClose: true}).then(() => {
        this.pending = true;
      this.manageProfilesService.notifyProfile(this.communityId, profile.id)
        .subscribe(res => {
          profile.notified = 1;
          this.pending = false;
        });
    });
  }

  loadExampleProfile(name: string): void {
    // clear localstorage values
    this.clearLocalStorage();
    // get new profile data
    this.manageProfilesService.loadExampleProfile(name)
      .subscribe(res => {
        console.log(res);
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
        localStorage.setItem('lowercase', res.lowercase);
        localStorage.setItem('stemming', res.stemming);
        localStorage.setItem('documentarea', res.documentarea);
        this.router.navigate(['../upload-content'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
      });
  }

}
