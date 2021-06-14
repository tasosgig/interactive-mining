import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { StepsnvabarComponent } from './stepsnvabar.component';

describe('StepsnvabarComponent', () => {
  let component: StepsnvabarComponent;
  let fixture: ComponentFixture<StepsnvabarComponent>;

  beforeEach(waitForAsync(() => {
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
