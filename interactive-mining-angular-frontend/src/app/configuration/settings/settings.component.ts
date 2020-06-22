import { Component, OnInit } from '@angular/core';
import {Settings} from './settings';
import {Phrase} from './phrase';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ConfigurationService} from '../configuration.service';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  public sliderConfig: any = {
    connect: [true, false],
    tooltips: [ true ],
    step: 1,
    range: {
      min: 1,
      max: 20
    },
    pips: {
      mode: 'positions',
      values: [0, 45, 100],
      density: 5,
      stepped: true
    }
  };

  public customRulesOpen = false;

  public positivePhrasesArray: Array<Phrase> = [];
  public negativePhrasesArray: Array<Phrase> = [];
  public positiveSelectedRow = -1;
  public negativeSelectedRow = -1;

  positivePhraseForm: FormGroup;
  negativePhraseForm: FormGroup;

  public settings: Settings;

  constructor(private formBuilder: FormBuilder,
              private route: ActivatedRoute,
              private router: Router,
              private configurationService: ConfigurationService) {
  }

  ngOnInit() {
    this.positivePhraseForm = this.formBuilder.group({
      phrase: [null, Validators.required],
      weight: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
    this.negativePhraseForm = this.formBuilder.group({
      phrase: [null, Validators.required],
      weight: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
    this.settings = {
      docname: localStorage.getItem('docname'),
      docsnumber: Number.parseInt(localStorage.getItem('docsnumber')),
      profileid: localStorage.getItem('profileid'),
      poswords: localStorage.getItem('poswords'),
      negwords: localStorage.getItem('negwords'),
      contextprev: Number.parseInt(localStorage.getItem('contextprev')),
      contextnext: Number.parseInt(localStorage.getItem('contextnext')),
      wordssplitnum: Number.parseInt(localStorage.getItem('wordssplitnum')),
      punctuation: Number.parseInt(localStorage.getItem('punctuation')),
      stopwords: Number.parseInt(localStorage.getItem('stopwords')),
      allLowercase: Number.parseInt(localStorage.getItem('allLowercase')),
      lowercase: Number.parseInt(localStorage.getItem('lowercase')),
      stemming: Number.parseInt(localStorage.getItem('stemming')),
      documentarea: localStorage.getItem('documentarea'),
    };
    // show positive phrases
    this.positivePhrasesArray.length = 0;
    const posphrases = JSON.parse(localStorage.getItem('poswords'));
    for (const key in posphrases) {
      if (key) {
        const content = new Phrase();
        content.phrase = key;
        content.weight = posphrases[key];
        this.positivePhrasesArray.push(content);
      }
    }
    // show negative phrases
    this.negativePhrasesArray.length = 0;
    const negphrases = JSON.parse(localStorage.getItem('negwords'));
    for (const key in negphrases) {
      if (key) {
        const content = new Phrase();
        content.phrase = key;
        content.weight = negphrases[key];
        this.negativePhrasesArray.push(content);
      }
    }
  }

  onSliderChange(value: number): void {
    localStorage.setItem('wordssplitnum', value.toString());
  }

  advancedCheckboxChange() {
    if (this.customRulesOpen) {
      this.customRulesOpen = false;
    } else {
      this.customRulesOpen = true;
    }
  }

  phraseSubmit(positive: boolean): void {
    const phrase = new Phrase();
    if (positive) {
      phrase.phrase = this.positivePhraseForm.get('phrase').value;
      phrase.weight = this.positivePhraseForm.get('weight').value;
      this.positivePhrasesArray.push(phrase);
      this.positivePhraseForm.reset();
    } else {
      phrase.phrase = this.negativePhraseForm.get('phrase').value;
      phrase.weight = this.negativePhraseForm.get('weight').value;
      this.negativePhrasesArray.push(phrase);
      this.negativePhraseForm.reset();
    }
    this.phrasesChanged(positive);
  }

  bulkPutPrhases(phrases: string, positive: boolean): void {
    if (positive) {
      localStorage.setItem('poswords', phrases);
      this.positivePhrasesArray.length = 0;
      const posphrases = JSON.parse(localStorage.getItem('poswords'));
      for (const key in posphrases) {
        if (key) {
          const content = new Phrase();
          content.phrase = key;
          content.weight = posphrases[key];
          this.positivePhrasesArray.push(content);
        }
      }
    } else {
      localStorage.setItem('negwords', phrases);
      this.negativePhrasesArray.length = 0;
      const negphrases = JSON.parse(localStorage.getItem('negwords'));
      for (const key in negphrases) {
        if (key) {
          const content = new Phrase();
          content.phrase = key;
          content.weight = negphrases[key];
          this.positivePhrasesArray.push(content);
        }
      }
    }
  }

  deletePhrase(index, positive: boolean): void {
    if (positive) {
      this.positivePhrasesArray.splice(index, 1);
    } else {
      this.negativePhrasesArray.splice(index, 1);
    }
    this.phrasesChanged(positive);
  }

  selectPhraseRow(row: number, positive: boolean) {
    if (positive) {
      this.positiveSelectedRow = row;
    } else {
      this.negativeSelectedRow = row;
    }
  }

  unselectPhraseRow(positive: boolean) {
    if (positive) {
      this.positiveSelectedRow = -1;
    } else {
      this.negativeSelectedRow = -1;
    }
  }

  phrasesChanged(positive: boolean): void {
    const hashmap = {};
    if (positive) {
      this.positivePhrasesArray.forEach(function(element) {
        hashmap[element.phrase] = element.weight;
      });
      localStorage.setItem('poswords', JSON.stringify(hashmap));
    } else {
      this.negativePhrasesArray.forEach(function(element) {
        hashmap[element.phrase] = element.weight;
      });
      localStorage.setItem('negwords', JSON.stringify(hashmap));
    }
  }

  contextprevChange(value): void {
    if (value < 0 || value > 20) {
      return;
    }
    localStorage.setItem('contextprev', value);
    this.getSettingsFromLocalStorage();
  }

  contextnextChange(value): void {
    if (value < 0 || value > 20) {
      return;
    }
    localStorage.setItem('contextnext', value);
    this.getSettingsFromLocalStorage();
  }

  stopwordsCheckBoxChange(value: boolean): void {
    localStorage.setItem('stopwords', value ? '1' : '0');
    this.settings.stopwords = value ? 1 : 0;
  }

  punctuationCheckBoxChange(value: boolean): void {
    localStorage.setItem('punctuation', value ? '1' : '0');
    this.settings.punctuation = value ? 1 : 0;
  }

  allLowercaseCheckBoxChange(value: boolean): void {
    localStorage.setItem('allLowercase', value ? '1' : '0');
    this.settings.allLowercase = value ? 1 : 0;
  }

  lowercaseCheckBoxChange(value: boolean): void {
    localStorage.setItem('lowercase', value ? '1' : '0');
    this.settings.lowercase = value ? 1 : 0;
  }

  stemmingCheckBoxChange(value: boolean): void {
    localStorage.setItem('stemming', value ? '1' : '0');
    this.settings.stemming = value ? 1 : 0;
  }

  documentAreaChange(value: string): void {
    localStorage.setItem('documentarea', value);
    this.settings.documentarea = value;
  }

  getSettingsFromLocalStorage(): Settings {
    return this.settings = {
      docname: localStorage.getItem('docname'),
      docsnumber: Number.parseInt(localStorage.getItem('docsnumber')),
      profileid: localStorage.getItem('profileid'),
      poswords: localStorage.getItem('poswords'),
      negwords: localStorage.getItem('negwords'),
      contextprev: Number.parseInt(localStorage.getItem('contextprev')),
      contextnext: Number.parseInt(localStorage.getItem('contextnext')),
      wordssplitnum: Number.parseInt(localStorage.getItem('wordssplitnum')),
      punctuation: Number.parseInt(localStorage.getItem('punctuation')),
      stopwords: Number.parseInt(localStorage.getItem('stopwords')),
      allLowercase: Number.parseInt(localStorage.getItem('allLowercase')),
      lowercase: Number.parseInt(localStorage.getItem('lowercase')),
      stemming: Number.parseInt(localStorage.getItem('stemming')),
      documentarea: localStorage.getItem('documentarea')
    };
  }

  saveProfile(): void {
    this.configurationService.saveProfileParameters(this.getSettingsFromLocalStorage())
      .subscribe(() => this.router.navigate(['../save-profile'], {relativeTo: this.route, queryParamsHandling: 'preserve'}));
  }

}
