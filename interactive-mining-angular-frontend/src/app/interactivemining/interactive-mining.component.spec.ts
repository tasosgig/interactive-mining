import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InteractiveMiningComponent } from './interactive-mining.component';

describe('InteractiveMiningComponent', () => {
  let component: InteractiveMiningComponent;
  let fixture: ComponentFixture<InteractiveMiningComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InteractiveMiningComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InteractiveMiningComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
