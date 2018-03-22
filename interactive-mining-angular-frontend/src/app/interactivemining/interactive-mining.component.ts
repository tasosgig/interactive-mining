import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-interactive-mining',
  templateUrl: './interactive-mining.component.html',
  styleUrls: ['./interactive-mining.component.css']
})
export class InteractiveMiningComponent implements OnInit {

  constructor(private route: ActivatedRoute, private router: Router) { }

  ngOnInit() {
    // this.router.navigate(['manage-profiles'], {relativeTo: this.route, queryParamsHandling: 'preserve' });
  }

}
