import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {Util} from '../util';
import {catchError} from 'rxjs/operators';

@Injectable()
export class SaveprofileService {

  private util: Util = new Util();

  private userId = '';
  private backendServerAddress = '';

  private saveProfileUrl = '/saveprofile';

  constructor(private http: HttpClient) {
    this.userId = this.util.getUserId();
    this.backendServerAddress = this.util.getBackendServerAddress();
  }

  saveProfile(name: string, id: string, docName: string, dosNumber: number): Observable<any> {
      return this.http.post(this.backendServerAddress + this.saveProfileUrl,
        {user: this.userId, name: name, id: id, docname: docName, docsnumber: dosNumber })
        .pipe(catchError(this.util.handleError));
  }

}
