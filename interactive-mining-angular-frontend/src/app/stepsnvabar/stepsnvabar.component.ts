import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';

@Component({
  selector: 'app-stepsnvabar',
  templateUrl: './stepsnvabar.component.html',
  styleUrls: ['./stepsnvabar.component.css']
})
export class StepsnvabarComponent implements OnInit {

  private proccessStep = 0;

  constructor(private route: ActivatedRoute, private router: Router) {
    router.events.subscribe((val) => {
      // see also
      if (val instanceof NavigationEnd) {
        this.changeStep(val.urlAfterRedirects);
      }
    });
  }

  ngOnInit() {}

  changeStep(url: string): void {
    if (url.indexOf('mining/upload-content') >= 0) {
      this.proccessStep = 1;
    } else if (url.indexOf('mining/configure-profile') >= 0) {
      this.proccessStep = 2;
    } else if (url.indexOf('mining/save-profile') >= 0) {
      this.proccessStep = 3;
    } else {
      this.proccessStep = 0;
    }
  }

  cancelHandle(): void {
    this.router.navigate(['../manage-profiles'], {relativeTo: this.route, queryParamsHandling: 'preserve'});
  }

}
