import { Injectable } from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {HttpClient} from '@angular/common/http';
import {Util} from '../util';

@Injectable()
export class SaveprofileService {

  private util: Util = new Util();

  private saveProfileUrl = 'http://localhost:8080/saveprofile';

  constructor(private http: HttpClient) { }

  saveProfile(name: string, id: string, docName: string, dosNumber: number): Observable<any> {
      return this.http.post(this.saveProfileUrl, {name: name, id: id, docname: docName, docsnumber: dosNumber }, { withCredentials: true })
        .catch(this.util.handleError);
  }

}
