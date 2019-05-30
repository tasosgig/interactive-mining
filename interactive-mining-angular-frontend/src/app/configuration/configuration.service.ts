import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import {Settings} from './settings/settings';
import {DocSamplesMetadata} from './doc-samples-metadata';
import {Util} from '../util';
import { map, catchError } from 'rxjs/operators';

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
      .pipe(map(data => data['documents']))
      .pipe(catchError(this.util.handleError));
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
      .pipe(map(res => res['data']))
      .pipe(catchError(this.util.handleError));
  }

  chooseDocumentsSample(choise: string): Observable<number> {
    return this.http.post(this.backendServerAddress + this.chooseSampleUrl, {user: this.userId, docsample: choise})
      .pipe(map(res => res['data']))
      .pipe(catchError(this.util.handleError));
  }

  getLoadedDocumentsNumber(): Observable<any> {
    return this.http.get(this.backendServerAddress + this.alreadyDocumentsUrl + `?user=${this.userId}`)
      .pipe(catchError(this.util.handleError));
  }

  runMining(parameters: Settings): Observable<any> {
    return this.http.post(this.backendServerAddress + this.runMiningUrl,
      {user: this.userId, parameters: parameters})
      .pipe(catchError(this.util.handleError));
  }

  saveProfileParameters(parameters: Settings): Observable<any> {
    const concepts = localStorage.getItem('concepts');
    return this.http.post(this.backendServerAddress + this.prepareSavedProfileUrl,
      {user: this.userId, concepts: concepts, parameters: parameters})
      .pipe(catchError(this.util.handleError));
  }

}
