import { Component, OnInit } from '@angular/core';
import {ConfigurationService} from '../configuration.service';
import UIkit from 'uikit';
import {Settings} from '../settings/settings';
import {DocumentResult} from './document-result';
import {Match} from './match';
import {DocSamplesMetadata} from '../doc-samples-metadata';
import {ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-resultspreview',
  templateUrl: './resultspreview.component.html',
  styleUrls: ['./resultspreview.component.css']
})
export class ResultspreviewComponent implements OnInit {

  public docSamples: Array<DocSamplesMetadata> = [];
  public docNameLoaded = '';
  public documentsLoaded = 0;
  public runingMining = false;
  public resultsArray: Array<DocumentResult> = [];
  public matches_number = '';
  public prev_matches_number = '';

  constructor(private route: ActivatedRoute, private router: Router, private configurationService: ConfigurationService) { }

  ngOnInit() {
    this.getDocSamples();
    this.getLoadedDocuments();
    this.docNameLoaded = localStorage.getItem('docname');
  }

  getDocSamples(): void {
    this.configurationService.getDocSamples()
      .subscribe(res => this.docSamples = res);
  }

  getLoadedDocuments(): void {
    this.configurationService.getLoadedDocumentsNumber()
      .subscribe(res => {
        this.documentsLoaded = res.data;
        localStorage.setItem('docsnumber', res.toString());
        if (res.data > 0) {

        } else {

        }
      });
  }

  chooseSample(choice: string): void {
    this.configurationService.chooseDocumentsSample(choice)
      .subscribe(res => {
        this.documentsLoaded = res;
        this.docNameLoaded = choice;
        localStorage.setItem('docname', choice);
        localStorage.setItem('docsnumber', res.toString());
      });
  }

  fileChangeUpload(event): void {
    const fileList: FileList = event.target.files;
    if (fileList && fileList.length === 1) {
      const file: File = fileList[0];
      // get new profile data
      this.configurationService.uploadDocuments(file)
        .subscribe(res => {
          this.documentsLoaded = res;
          this.docNameLoaded = file.name;
          localStorage.setItem('docname', file.name);
          localStorage.setItem('docsnumber', res.toString());
        });
    }
  }

  getSettingsFromLocalStorage(): Settings {
    return {
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
      lowercase: Number.parseInt(localStorage.getItem('lowercase')),
      stemming: Number.parseInt(localStorage.getItem('stemming')),
      documentarea: localStorage.getItem('documentarea'),
    };
  }

  saveProfile(): void {
    this.configurationService.saveProfileParameters(this.getSettingsFromLocalStorage())
      .subscribe(() => this.router.navigate(['../save-profile'], {relativeTo: this.route, queryParamsHandling: 'preserve'}));
  }

  highlightInElement(element: string, text: string): string {
    var elementHtml = element;
    var tags = [];
    var tagLocations = [];
    var htmlTagRegEx = /<{1}\/{0,1}\w+>{1}/;

    // Strip the tags from the elementHtml and keep track of them
    var htmlTag;
    while (htmlTag = elementHtml.match(htmlTagRegEx)) {
      tagLocations[tagLocations.length] = elementHtml.search(htmlTagRegEx);
      tags[tags.length] = htmlTag;
      elementHtml = elementHtml.replace(htmlTag, '');
    }

    // Search for the text in the stripped html
    var textLocation = elementHtml.search(text);
    if (textLocation) {
      //Add the highlight
      var highlightHTMLStart = '<span class="highlight">';
      var highlightHTMLEnd = '</span>';
      elementHtml = elementHtml.replace(text, highlightHTMLStart + text + highlightHTMLEnd);

      // Plug back in the HTML tags
      var textEndLocation = textLocation + text.length;
      for(let i = tagLocations.length - 1; i >= 0; i--) {
        var location = tagLocations[i];
        if(location > textEndLocation){
          location += highlightHTMLStart.length + highlightHTMLEnd.length;
        } else if (location > textLocation) {
          location += highlightHTMLStart.length;
        }
        elementHtml = elementHtml.substring(0, location) + tags[i] + elementHtml.substring(location);
      }
    }

    // Update the innerHTML of the element
    element = elementHtml;
    return element;
  }

  runMining(): void {
    if (this.documentsLoaded) {
      // display wait message
      this.runingMining = true;
      // document.getElementById('wait-spinner-modal-center').addClass("uk-open");
      this.configurationService.runMining(this.getSettingsFromLocalStorage())
        .subscribe( res => {
          // hide wait message
          this.runingMining = false;
          UIkit.modal(document.getElementById('wait-spinner-modal-center')).hide();
          // enable sticky
          UIkit.sticky(document.getElementById("cm-run-test-section"), {
            top: 25,
            showOnUp: true,
            animation: "uk-animation-slide-top",
            bottom: ".cm-results-section"
          });
          this.resultsArray.length = 0;
          let matchcounter = 0;
          for (let title in res.matches) {
            if (title) {
              const matches = res.matches[title];
              let resultClass: DocumentResult = new DocumentResult();
              resultClass.docTitle = title;
              let matchesArray: Array<Match> = [];
              resultClass.matches = matchesArray;
              for (let values of matches) {
                let match: Match = new Match();
                match.match = values.match;
                match.extraprev = values.extraprev;
                match.extranext = values.extranext;
                let context = values.prev + ' ' + values.middle + ' ' + values.next;
                // hightlight positive words
                for (let posword in JSON.parse(localStorage.getItem('poswords'))) {
                  const search_regexp = new RegExp(posword, 'g');
                  context = context.replace(search_regexp, function (x) {
                    return '<span class="positive">' + x + '</span>';
                  });
                }
                // hightlight acknowledgment keywords
                for (let ackn of values.acknmatch) {
                  const search_regexp = new RegExp(ackn.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&'), 'g');
                  context = context.replace(search_regexp, '<span class="positive">' + ackn + '</span>');
                }
                // hightlight negative words
                for (let negword in JSON.parse(localStorage.getItem('negwords'))) {
                  const search_regexp = new RegExp(negword, 'g');
                  context = context.replace(search_regexp, function (x) {
                    return '<span class="negative">' + x + '</span>';
                  });
                }
                context = this.highlightInElement(context, values.match);
                match.context = context;
                match.matchcounter = ++matchcounter;
                matchesArray.push(match);
              }
              this.resultsArray.push(resultClass);
            }
          }
          this.prev_matches_number = this.matches_number;
          this.matches_number = matchcounter + '';
        });
    }
  }

}
