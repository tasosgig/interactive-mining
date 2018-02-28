import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    // initialize settings
    if (!localStorage.getItem('docname') || localStorage.getItem('docname') === 'undefined') {
      localStorage.setItem('docname', '');
    }
    if (!localStorage.getItem('docsnumber') || localStorage.getItem('docsnumber') === 'undefined') {
      localStorage.setItem('docsnumber', '0');
    }
    if (!localStorage.getItem('profileid') || localStorage.getItem('profileid') === 'undefined') {
      localStorage.setItem('profileid', '');
    }
    if (!localStorage.getItem('precision') || localStorage.getItem('precision') === 'undefined') {
      localStorage.setItem('precision', '1');
    }
    if (!localStorage.getItem('poswords') || localStorage.getItem('poswords') === 'undefined') {
      localStorage.setItem('poswords', '{}');
    }
    if (!localStorage.getItem('negwords') || localStorage.getItem('negwords') === 'undefined') {
      localStorage.setItem('negwords', '{}');
    }
    if (!localStorage.getItem('contextprev') || localStorage.getItem('contextprev') === 'undefined') {
      localStorage.setItem('contextprev', '10');
    }
    if (!localStorage.getItem('contextnext') || localStorage.getItem('contextnext') === 'undefined') {
      localStorage.setItem('contextnext', '5');
    }
    if (!localStorage.getItem('wordssplitnum') || localStorage.getItem('wordssplitnum') === 'undefined') {
      localStorage.setItem('wordssplitnum', '2');
    }
    if (!localStorage.getItem('punctuation') || localStorage.getItem('punctuation') === 'undefined') {
      localStorage.setItem('punctuation', '0');
    }
    if (!localStorage.getItem('stopwords') || localStorage.getItem('stopwords') === 'undefined') {
      localStorage.setItem('stopwords', '0');
    }
    if (!localStorage.getItem('lettercase') || localStorage.getItem('lettercase') === 'undefined') {
      localStorage.setItem('lettercase', 'None');
    }
  }

}
