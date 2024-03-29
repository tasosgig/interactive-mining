import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import UIkit from 'uikit';

@Component({
  selector: 'app-stepsnvabar',
  templateUrl: './stepsnvabar.component.html',
  styleUrls: ['./stepsnvabar.component.css']
})
export class StepsnvabarComponent implements OnInit {

  public processStep = 0;

  constructor(private route: ActivatedRoute, private router: Router) {
    router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.changeStep(val.urlAfterRedirects);
      }
    });
  }

  ngOnInit() {}

  changeStep(url: string): void {
    if (url.indexOf('mining/upload-content') >= 0) {
      this.processStep = 1;
    } else if (url.indexOf('mining/configure-profile') >= 0) {
      this.processStep = 2;
    } else if (url.indexOf('mining/save-profile') >= 0) {
      this.processStep = 3;
    } else {
      this.processStep = 0;
    }
  }

  cancelHandle(processStep: number): void {
    if (processStep === 3) {
      UIkit.modal.confirm('<span class="uk-text-bold">' +
        'Your changes have not been saved to your Profile!<br>Are you sure you want to leave?</span>', {escClose: true}).then(() => {
        this.router.navigate(['../manage-profiles'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
      }, () => false);
    } else {
      this.router.navigate(['../manage-profiles'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
    }
  }

}
