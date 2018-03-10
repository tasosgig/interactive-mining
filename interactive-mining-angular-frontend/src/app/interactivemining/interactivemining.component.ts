import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-interactivemining',
  templateUrl: './interactivemining.component.html',
  styleUrls: ['./interactivemining.component.css']
})
export class InteractiveminingComponent implements OnInit {

  private _userid = 'None';
  private _backendserveraddress = 'None';

  constructor() { }

  ngOnInit() {
  }

  @Input('userid')
  set userid(userid: string) {
    localStorage.setItem('user_id', userid);
    this._userid = userid;
  }

  @Input('backendserveraddress')
  set backendserveraddress(backendserveraddress: string) {
    localStorage.setItem('backendaddress', backendserveraddress);
    this._backendserveraddress = backendserveraddress;

  }

}
