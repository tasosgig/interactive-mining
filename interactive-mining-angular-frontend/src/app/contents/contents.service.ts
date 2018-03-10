import {Injectable} from '@angular/core';
import {Content} from './content';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import {Observable} from 'rxjs/Observable';
import {Util} from '../util';


@Injectable()
export class ContentsService {

  private util: Util = new Util();

  private userId = '';
  private backendServerAddress = '';
  private concepts = '';

  private getContentUrl = '/alreadyconcept';
  private uploadContentFileUrl = '/uploadcontentfile';
  private updateContentUrl = '/updateconcept';

  constructor(private http: HttpClient) {
    this.userId = this.util.getUserId();
    this.backendServerAddress = this.util.getBackendServerAddress();
  }

  getContent(): Observable<Content[]> {
    this.concepts = localStorage.getItem('concepts');
    return this.http.get(this.backendServerAddress + this.getContentUrl + `?user=${this.userId}&concepts=${this.concepts}`)
      .map((data) => this.contentsJsonToArray(data['data']))
      .catch(this.util.handleError);
  }

  contentsJsonToArray(json): Content[] {
    const contentArray: Array<Content> = [];
    for (let key in json) {
      if (key) {
        const content = new Content();
        content.keyword = key;
        content.context = json[key];
        contentArray.push(content);
      }
    }
    return contentArray;
  }

  uploadFile(file: File): Observable<Content[]> {
    const formData: FormData = new FormData();
    formData.append('upload', file, file.name);
    formData.append('user', this.userId);
    const params = new HttpParams();
    const options = {
      headers: new HttpHeaders().set('Accept', 'application/json').delete('Content-Type'),
      params: params,
      reportProgress: true
    };
    return this.http.post(this.backendServerAddress + this.uploadContentFileUrl, formData, options)
      .map((data) => this.contentsJsonToArray(data['data']))
      .catch(this.util.handleError);
  }

  updateContent(content: Array<Content>): Observable<any> {
    // transform data to json string
    var hashmap = {};
    content.forEach(function (element) {
      hashmap[element.keyword] = element.context;
    });
    return this.http.post(this.backendServerAddress + this.updateContentUrl, {user: this.userId, concepts: JSON.stringify(hashmap)})
      .map((data) => data['concepts'])
      .catch(this.util.handleError);
  }

}
