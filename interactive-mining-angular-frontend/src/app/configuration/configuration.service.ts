import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs/Observable';
import {Settings} from './settings/settings';
import {DocSamplesMetadata} from './doc-samples-metadata';
import {Util} from '../util';

@Injectable()
export class ConfigurationService {

  private util: Util = new Util();

  private userId = '';
  private backendServerAddress = '';

  private getDocSamplesUrl = '/getdocsamples';
  private uploadDocumentsUrl = '/uploaddocuments';
  private chooseSampleUrl = '/choosedocsample';
  private alreadyDocumentsUrl = '/alreadydocuments';
  private runMiningUrl = '/runmining';
  private prepareSavedProfileUrl = '/preparesavedprofile';

  constructor(private http: HttpClient) {
    this.userId = this.util.getUserId();
    this.backendServerAddress = this.util.getBackendServerAddress();
  }

  getDocSamples(): Observable<DocSamplesMetadata[]> {
    return this.http.get(this.backendServerAddress + this.getDocSamplesUrl + `?user=${this.userId}`)
      .map(data => data['documents'])
      .catch(this.util.handleError);
  }

  uploadDocuments(file: File): Observable<number> {
    const formData: FormData = new FormData();
    formData.append('upload', file, file.name);
    formData.append('user', this.userId);
    const params = new HttpParams();
    const options = {
      headers: new HttpHeaders().set('Accept', 'application/json').delete('Content-Type'),
      params: params,
      reportProgress: true
    };
    return this.http.post(this.backendServerAddress + this.uploadDocumentsUrl, formData, options)
      .map(res => res['data'])
      .catch(this.util.handleError);
  }

  chooseDocumentsSample(choise: string): Observable<number> {
    return this.http.post(this.backendServerAddress + this.chooseSampleUrl, {user: this.userId, docsample: choise})
      .map(res => res['data'])
      .catch(this.util.handleError);
  }

  getLoadedDocumentsNumber(): Observable<any> {
    return this.http.get(this.backendServerAddress + this.alreadyDocumentsUrl + `?user=${this.userId}`)
      .catch(this.util.handleError);
  }

  runMining(parameters: Settings): Observable<any> {
    return this.http.post(this.backendServerAddress + this.runMiningUrl,
      {user: this.userId, parameters: parameters})
      .catch(this.util.handleError);
  }

  saveProfileParameters(parameters: Settings): Observable<any> {
    const concepts = localStorage.getItem('concepts');
    return this.http.post(this.backendServerAddress + this.prepareSavedProfileUrl,
      {user: this.userId, concepts: concepts, parameters: parameters})
      .catch(this.util.handleError);
  }

}
