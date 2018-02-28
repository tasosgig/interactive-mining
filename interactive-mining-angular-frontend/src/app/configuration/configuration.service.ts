import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Util} from '../util';
import {Observable} from 'rxjs/Observable';
import {ProfileData} from '../manageprofiles/profile-data';
import {Settings} from './settings/settings';
import {DocSamplesMetadata} from './doc-samples-metadata';

@Injectable()
export class ConfigurationService {

  private util: Util = new Util();

  private getDocSamplesUrl = 'http://localhost:8080/getdocsamples';
  private uploadDocumentsUrl = 'http://localhost:8080/uploaddocuments';
  private chooseSampleUrl = 'http://localhost:8080/choosedocsample';
  private alreadyDocumentsUrl = 'http://localhost:8080/alreadydocuments';
  private runMiningUrl = 'http://localhost:8080/runmining';
  private prepareSavedProfileUrl = 'http://localhost:8080/preparesavedprofile';

  constructor(private http: HttpClient) { }

  private _getHeaders(): Headers {
    const header = new Headers({
      'Content-Type': 'application/json'
    });

    return header;
  }

  getDocSamples(): Observable<DocSamplesMetadata[]> {
    return this.http.get(this.getDocSamplesUrl, { withCredentials: true })
      .map(data => data['documents'])
      .catch(this.util.handleError);
  }

  uploadDocuments(file: File): Observable<number> {
    const formData: FormData = new FormData();
    formData.append('upload', file, file.name);
    const params = new HttpParams();
    const options = {
      headers: new HttpHeaders().set('Accept', 'application/json').delete('Content-Type'),
      params: params,
      reportProgress: true,
      withCredentials: true,
    };
    return this.http.post(this.uploadDocumentsUrl, formData, options)
      .map(res => res['data'])
      .catch(this.util.handleError);
  }

  chooseDocumentsSample(choise: string): Observable<number> {
    return this.http.post(this.chooseSampleUrl, {docsample: choise}, { withCredentials: true })
      .map(res => res['data'])
      .catch(this.util.handleError);
  }

  getLoadedDocumentsNumber(): Observable<any> {
    return this.http.get(this.alreadyDocumentsUrl, { withCredentials: true })
      .catch(this.util.handleError);
  }

  runMining(parameters: string): Observable<any> {
    return this.http.post(this.runMiningUrl,
      parameters, { withCredentials: true })
      .catch(this.util.handleError);
  }

  saveProfileParameters(parameters: Settings): Observable<any> {
    return this.http.post(this.prepareSavedProfileUrl, parameters, { withCredentials: true })
      .catch(this.util.handleError);
  }

}
