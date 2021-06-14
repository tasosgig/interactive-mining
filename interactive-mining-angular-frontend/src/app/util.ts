import UIkit from 'uikit';
import {HttpErrorResponse, HttpResponse} from '@angular/common/http';
import { environment } from '../environments/environment';
import {saveAs} from 'file-saver';
import {Observable} from 'rxjs';
import {throwError} from 'rxjs';

export class Util {

  public handleError (err: HttpErrorResponse): Observable<never> {
    if (err.error instanceof Error) {
      console.error('Client-side error occured.');
    } else {
      console.error('Server-side error occured.');
    }
    console.log(err);
    UIkit.notification({
      message: err.error,
      status: 'danger',
      pos: 'top-center',
      timeout: 0
    });
    return throwError(err  || 'Server error');
  }

  public getUserId(): string {
    return localStorage.getItem('user_id');
  }

  public getBackendServerAddress(): string {
    if (localStorage.getItem('mining_backend_address')) {
      return localStorage.getItem('mining_backend_address');
    } else {
      return environment.miningbackendserveraddress;
    }
  }

  public getIsCommunityManager(): string {
    return localStorage.getItem('isCommunityManager');
  }
}

/**
 * Saves a file by opening file-save-as dialog in the browser
 * using file-save library.
 * @param blobContent file content as a Blob
 * @param fileName name file should be saved as
 */
export const saveFile = (blobContent: Blob, fileName: string) => {
  const blob = new Blob([blobContent], { type: 'application/octet-stream' });
  saveAs(blob, fileName);
};

/**
 * Derives file name from the http response
 * by looking inside content-disposition
 * @param res http Response
 */
export const getFileNameFromResponseContentDisposition = (res: HttpResponse<any>) => {
  const contentDisposition = res.headers.get('content-disposition') || '';
  const matches = /filename=([^;]+)/ig.exec(contentDisposition);
  const fileName = (matches[1] || 'untitled').trim();
  return fileName;
};
