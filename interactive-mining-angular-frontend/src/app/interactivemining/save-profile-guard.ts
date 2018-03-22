import {ActivatedRouteSnapshot, CanDeactivate, RouterStateSnapshot} from '@angular/router';
import { Injectable } from '@angular/core';
import {ConfigurationComponent} from '../configuration/configuration.component';
import {ContentComponent} from '../contents/contents.component';

@Injectable()
export class SaveProfileGuard implements CanDeactivate<ConfigurationComponent> {

  canDeactivate(component: ConfigurationComponent,
                currentRoute: ActivatedRouteSnapshot,
                currentState: RouterStateSnapshot,
                nextState: RouterStateSnapshot) {
    return component.promptToLeave(nextState.toString());
  }

}

@Injectable()
export class UploadContentGuard implements CanDeactivate<ContentComponent> {

  canDeactivate(component: ContentComponent,
                currentRoute: ActivatedRouteSnapshot,
                currentState: RouterStateSnapshot,
                nextState: RouterStateSnapshot) {
    return component.promptToLeave(nextState.toString());
  }

}
