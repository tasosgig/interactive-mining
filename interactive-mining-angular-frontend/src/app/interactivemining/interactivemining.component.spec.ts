import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveminingComponent } from './interactivemining.component';

describe('InteractiveminingComponent', () => {
  let component: InteractiveminingComponent;
  let fixture: ComponentFixture<InteractiveminingComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InteractiveminingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InteractiveminingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
