import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  private _userid = 'user5649231';
  private _backendserveraddress = 'https://beta.services.openaire.eu/interactive-mining';
  private _isCommunityManager = 'true';

  title = 'app';

  ngOnInit() {
    localStorage.setItem('user_id', this._userid);
    console.log(localStorage.getItem('user_id'), this._userid);
    localStorage.setItem('mining_backend_address', this._backendserveraddress);
    console.log(localStorage.getItem('mining_backend_address'), this._backendserveraddress);
    localStorage.setItem('isCommunityManager', this._isCommunityManager);
    console.log(localStorage.getItem('isCommunityManager'), this._isCommunityManager);
  }
}
