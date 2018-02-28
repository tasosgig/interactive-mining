import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {ProfileData} from './profile-data';
import {Util} from '../util';
import {Observable} from 'rxjs/Observable';
import {ProfileMetadata} from './profile-metadata';
import {ExampleProfilesMetadata} from './example-profiles-metadata';
import {RequestOptions, ResponseContentType} from '@angular/http';

@Injectable()
export class ManageprofilesService {

  private util: Util = new Util();

  private getUserIdUrl = 'http://localhost:8080/getuserid';
  private getSavedProfilesUrl = 'http://localhost:8080/getuserprofiles';
  private downloadProfileUrl = 'http://localhost:8080/downloadprofile';
  private DeleteuserProfileUrl = 'http://localhost:8080/deleteuserprofile';
  private createNewProfileUrl = 'http://localhost:8080/createnewprofile';
  private loadSavedProfileUrl = 'http://localhost:8080/loaduserprofile';
  private getExampleProfilesUrl = 'http://localhost:8080/getexampleprofiles';
  private loadExampleProfileUrl = 'http://localhost:8080/loadexampleprofile';
  private uploadProfileUrl = 'http://localhost:8080/uploadprofile';

  constructor(private http: HttpClient) { }

  getUserIdToLocalStorage(): Observable<any> {
    return this.http.get(this.getUserIdUrl, { withCredentials: true })
       .catch(this.util.handleError);
  }

  downloadProfile(profileId: string): Observable<any> {
    return this.http.post(this.downloadProfileUrl, {id: profileId}, { responseType: 'blob', withCredentials: true })
      .catch(this.util.handleError);
  }

  deleteProfile(profileId: string): Observable<any> {
    return this.http.post(this.DeleteuserProfileUrl, {id: profileId}, { withCredentials: true })
      .catch(this.util.handleError);
  }

  createNewProfile(): Observable<any> {
    return this.http.get(this.createNewProfileUrl, { withCredentials: true })
      .catch(this.util.handleError);
  }

  loadSavedProfile(profileId: string): Observable<ProfileData> {
    return this.http.post<ProfileData>(this.loadSavedProfileUrl, {
      id: profileId
    }, { withCredentials: true })
      .catch(this.util.handleError);
  }

  loadExampleProfile(name: string): Observable<ProfileData> {
    return this.http.get<ProfileData>(this.loadExampleProfileUrl, { withCredentials: true })
      .catch(this.util.handleError);
  }

  uploadFile(file: File): Observable<ProfileData> {
    const formData: FormData = new FormData();
    formData.append('upload', file, file.name);
    const params = new HttpParams();
    const options = {
      headers: new HttpHeaders().set('Accept', 'application/json').delete('Content-Type'),
      params: params,
      reportProgress: true,
      withCredentials: true,
    };
    return this.http.post<ProfileData>(this.uploadProfileUrl, formData, options)
      .catch(this.util.handleError);
  }

  getSavedProfiles(): Observable<ProfileMetadata[]> {
    return this.http.get(this.getSavedProfilesUrl, { withCredentials: true })
      .map(data => data['profiles'])
      .catch(this.util.handleError);
  }

  getExampleProfiles(): Observable<ExampleProfilesMetadata[]> {
    return this.http.get(this.getExampleProfilesUrl, { withCredentials: true })
      .map(data => data['profiles'])
      .catch(this.util.handleError);
  }

}
