import { Injectable } from '@angular/core';
import { Content } from './content';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import {Observable} from 'rxjs/Observable';
import {Util} from '../util';
import UIkit from 'uikit';
import {ProfileData} from '../manageprofiles/profile-data';


@Injectable()
export class ContentsService {

  private util: Util = new Util();

  private getContentUrl = 'http://localhost:8080/alreadyconcept';
  private uploadContentFileUrl = 'http://localhost:8080/uploadcontentfile';
  private updateContentUrl = 'http://localhost:8080/updateconcept';

  constructor(private http: HttpClient) { }

  getContent(): Observable<Content[]> {
    return this.http.get(this.getContentUrl, { withCredentials: true })
      .map((data) => this.contentsJsonToArray(data['data']))
      .catch(this.util.handleError);
  }

  contentsJsonToArray(json): Content[] {
    const contentArray: Array<Content> = [];
    Object.entries(json).forEach(
      ([key, value]) => {
        const content = new Content();
        content.keyword = key;
        content.context = value;
        contentArray.push(content);
      }
    );
    return contentArray;
  }

  uploadFile(file: File): Observable<Content[]> {
    const formData: FormData = new FormData();
    formData.append('upload', file, file.name);
    const params = new HttpParams();
    const options = {
      headers: new HttpHeaders().set('Accept', 'application/json').delete('Content-Type'),
      params: params,
      reportProgress: true,
      withCredentials: true,
    };
    return this.http.post(this.uploadContentFileUrl, formData, options)
      .map((data) => this.contentsJsonToArray(data['data']))
      .catch(this.util.handleError);
  }

  updateContent(content: Array<Content>): Observable<any> {
    // transform data to json string
    var hashmap = {};
    content.forEach(function(element) {
      hashmap[element.keyword] = element.context;
    });
    console.log(JSON.stringify(hashmap));
    return this.http.post(this.updateContentUrl, {
      concepts: JSON.stringify(hashmap)
    }, { withCredentials: true })
      .catch(this.util.handleError);
  }

}
