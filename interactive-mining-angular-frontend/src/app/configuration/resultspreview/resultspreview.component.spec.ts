import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultspreviewComponent } from './resultspreview.component';

describe('ResultspreviewComponent', () => {
  let component: ResultspreviewComponent;
  let fixture: ComponentFixture<ResultspreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ResultspreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResultspreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
