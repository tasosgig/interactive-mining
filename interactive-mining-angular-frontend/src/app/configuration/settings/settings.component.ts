import { Component, OnInit } from '@angular/core';
import {Settings} from './settings';
import {Phrase} from './phrase';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ConfigurationService} from '../configuration.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {

  private oldPrecision = 1;
  public precision = 1;

  public positivePhrasesArray: Array<Phrase> = [];
  public negativePhrasesArray: Array<Phrase> = [];
  public positiveSelectedRow = -1;
  public negativeSelectedRow = -1;

  positivePhraseForm: FormGroup;
  negativePhraseForm: FormGroup;

  public settings: Settings;

  public lettercases = [
    { value: 'none', display: ' As it is' },
    { value: 'uppercase', display: ' UPPERCASE' },
    { value: 'lowercase', display: ' lowercase' }
  ];

  constructor(private formBuilder: FormBuilder, private router: Router, private configurationService: ConfigurationService) { }

  ngOnInit() {
    this.positivePhraseForm = this.formBuilder.group({
      phrase: [null, Validators.required],
      weight: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
    this.negativePhraseForm = this.formBuilder.group({
      phrase: [null, Validators.required],
      weight: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });
    this.precision = Number.parseInt(localStorage.getItem('precision'));
    this.settings = {
      docname: localStorage.getItem('docname'),
      docsnumber: Number.parseInt(localStorage.getItem('docsnumber')),
      profileid: localStorage.getItem('profileid'),
      precision: Number.parseInt(localStorage.getItem('precision')),
      poswords: localStorage.getItem('poswords'),
      negwords: localStorage.getItem('negwords'),
      contextprev: Number.parseInt(localStorage.getItem('contextprev')),
      contextnext: Number.parseInt(localStorage.getItem('contextnext')),
      wordssplitnum: Number.parseInt(localStorage.getItem('wordssplitnum')),
      punctuation: Number.parseInt(localStorage.getItem('punctuation')),
      stopwords: Number.parseInt(localStorage.getItem('stopwords')),
      lettercase: localStorage.getItem('lettercase')
    };
    // show positive phrases
    this.positivePhrasesArray.length = 0;
    Object.entries(JSON.parse(localStorage.getItem('poswords'))).forEach(
      ([key, value]) => {
        const content = new Phrase();
        content.phrase = key;
        content.weight = value;
        this.positivePhrasesArray.push(content);
      }
    );
    // show negative phrases
    this.negativePhrasesArray.length = 0;
    Object.entries(JSON.parse(localStorage.getItem('negwords'))).forEach(
      ([key, value]) => {
        const content = new Phrase();
        content.phrase = key;
        content.weight = value;
        this.negativePhrasesArray.push(content);
      }
    );
  }

  getSettingsFromLocalStorage(): Settings {
    return this.settings = {
      docname: localStorage.getItem('docname'),
      docsnumber: Number.parseInt(localStorage.getItem('docsnumber')),
      profileid: localStorage.getItem('profileid'),
      precision: Number.parseInt(localStorage.getItem('precision')),
      poswords: localStorage.getItem('poswords'),
      negwords: localStorage.getItem('negwords'),
      contextprev: Number.parseInt(localStorage.getItem('contextprev')),
      contextnext: Number.parseInt(localStorage.getItem('contextnext')),
      wordssplitnum: Number.parseInt(localStorage.getItem('wordssplitnum')),
      punctuation: Number.parseInt(localStorage.getItem('punctuation')),
      stopwords: Number.parseInt(localStorage.getItem('stopwords')),
      lettercase: localStorage.getItem('lettercase')
    };
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
      Object.entries(JSON.parse(localStorage.getItem('poswords'))).forEach(
        ([key, value]) => {
          const content = new Phrase();
          content.phrase = key;
          content.weight = value;
          this.positivePhrasesArray.push(content);
        }
      );
    } else {
      localStorage.setItem('negwords', phrases);
      this.negativePhrasesArray.length = 0;
      Object.entries(JSON.parse(localStorage.getItem('negwords'))).forEach(
        ([key, value]) => {
          const content = new Phrase();
          content.phrase = key;
          content.weight = value;
          this.negativePhrasesArray.push(content);
        }
      );
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

  precisionChange(precision: number) {
    this.precision = precision;
    localStorage.setItem('precision', this.precision.toString());
    this.oldPrecision = precision;
    if (this.precision === 1) {
      this.bulkPutPrhases('{"European Grid Initiative":"1","European Grid Infrastructure":"1","EGI":"1"}', true);
    } else if (this.precision === 2) {
      this.bulkPutPrhases('{}', true);
    } else if (this.precision === 3) {
      this.bulkPutPrhases('{}', true);
    }
  }

  advancedCheckboxChange(): void {
    if (this.precision === 4) {
      this.precision = this.oldPrecision;
    } else {
      this.precision = 4;
    }
    localStorage.setItem('precision', this.precision.toString());
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

  wordssplitnumChange(value): void {
    if (value < 0 || value > 10) {
      return;
    }
    localStorage.setItem('wordssplitnum', value);
    this.getSettingsFromLocalStorage();
  }

  stopwordsCheckBoxChange(value: boolean): void {
    localStorage.setItem('stopwords', value ? '1' : '0');
  }

  punctuationCheckBoxChange(value: boolean): void {
    localStorage.setItem('punctuation', value ? '1' : '0');
  }

  letterCaseChange(lettercase): void {
    localStorage.setItem('lettercase', lettercase);
  }

  saveProfile(): void {
    this.configurationService.saveProfileParameters(this.getSettingsFromLocalStorage())
      .subscribe(() => this.router.navigate(['/save-profile']));
  }

}
