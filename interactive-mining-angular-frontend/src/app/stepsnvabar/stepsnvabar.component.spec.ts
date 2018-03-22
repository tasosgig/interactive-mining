import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { StepsnvabarComponent } from './stepsnvabar.component';

describe('StepsnvabarComponent', () => {
  let component: StepsnvabarComponent;
  let fixture: ComponentFixture<StepsnvabarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ StepsnvabarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(StepsnvabarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
