import { Component, OnInit, AfterViewInit } from '@angular/core';
import UIkit from 'uikit';
import {Observable} from 'rxjs/Observable';

@Component({
  selector: 'app-configuration',
  templateUrl: './configuration.component.html',
  styleUrls: ['./configuration.component.css']
})
export class ConfigurationComponent implements OnInit, AfterViewInit {

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
      localStorage.setItem('wordssplitnum', '1');
    }
    if (!localStorage.getItem('punctuation') || localStorage.getItem('punctuation') === 'undefined') {
      localStorage.setItem('punctuation', '0');
    }
    if (!localStorage.getItem('stopwords') || localStorage.getItem('stopwords') === 'undefined') {
      localStorage.setItem('stopwords', '0');
    }
    if (!localStorage.getItem('lowercase') || localStorage.getItem('lowercase') === 'undefined') {
      localStorage.setItem('lowercase', '0');
    }
    if (!localStorage.getItem('stemming') || localStorage.getItem('stemming') === 'undefined') {
      localStorage.setItem('stemming', '0');
    }
  }

  promptToLeave(nextUrl: string): boolean {
    if (nextUrl.indexOf('upload-content') >= 0 || nextUrl.indexOf('configure-profile') >= 0 || nextUrl.indexOf('save-profile') >= 0) {
      return true;
    } else {
      return UIkit.modal.confirm('<span class="uk-text-bold">' +
        'Your changes have not been saved to your Profile!<br>Are you sure you want to leave?</span>', {escClose: true}).then(() => {
        return true;
      }, () => false);
    }
  }

  ngAfterViewInit() {
    // $('#child1').stickySidebar();
    if (document.getElementById('enableStickyBarScript')) {
      document.getElementById('enableStickyBarScript').remove();
    }
    const enableStickyBarScript = document.createElement('script');
    enableStickyBarScript.setAttribute('id', 'enableStickyBarScript');
    enableStickyBarScript.innerHTML = '$(\"#child1\").stickySidebar();\n';
    document.body.appendChild(enableStickyBarScript);
  }

}
