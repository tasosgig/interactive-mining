import {Observable} from 'rxjs/Observable';
import UIkit from 'uikit';
import {HttpErrorResponse} from '@angular/common/http';
import { saveAs } from 'file-saver/FileSaver';
import { Response } from '@angular/http';
import {ErrorObservable} from 'rxjs/observable/ErrorObservable';

export class Util {

  public handleError (err: HttpErrorResponse): ErrorObservable {
    if (err.error instanceof Error) {
      console.error('Client-side error occured.');
    } else {
      console.error('Server-side error occured.');
    }
    console.log(err);
    UIkit.notification({
      message: err.message,
      status: 'danger',
      pos: 'top-center',
      timeout: 0
    });
    return Observable.throw(err  || 'Server error');
  }

  public getUserId(): string {
    return localStorage.getItem('user_id');
  }

  public getBackendServerAddress(): string {
    return localStorage.getItem('mining_backend_address');
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
export const getFileNameFromResponseContentDisposition = (res: Response) => {
  const contentDisposition = res.headers.get('content-disposition') || '';
  const matches = /filename=([^;]+)/ig.exec(contentDisposition);
  const fileName = (matches[1] || 'untitled').trim();
  return fileName;
};
