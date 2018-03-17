import { Component, OnInit } from '@angular/core';
import UIkit from 'uikit';
import {SaveprofileService} from './saveprofile.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-saveprofile',
  templateUrl: './saveprofile.component.html',
  styleUrls: ['./saveprofile.component.css']
})
export class SaveprofileComponent implements OnInit {

  public profileName = 'New profile name';
  public docnName = '';
  public docsNumber = 0;

  constructor(private saveprofileService: SaveprofileService, private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    if (localStorage.getItem('profilename') && localStorage.getItem('profilename') !== 'undefined') {
      this.profileName = localStorage.getItem('profilename');
    }
    if (localStorage.getItem('docname') && localStorage.getItem('docname') !== 'undefined') {
      this.docnName = localStorage.getItem('docname');
    }
    if (localStorage.getItem('docsnumber') && localStorage.getItem('docsnumber') !== 'undefined') {
      this.docsNumber = Number.parseInt(localStorage.getItem('docsnumber'));
    }
  }

  saveProfile(): void {
    if (this.profileName === '') {
      UIkit.notification({
        message: 'You have to provide a name to your new profile',
        status: 'danger',
        pos: 'top-center',
        timeout: 4000
      });
      return;
    } else {
      this.saveprofileService.saveProfile(this.profileName, localStorage.getItem('profileid'), this.docnName, this.docsNumber)
        .subscribe(() => this.router.navigate(['../manage-profiles'], {relativeTo: this.route}));
    }
  }

}
