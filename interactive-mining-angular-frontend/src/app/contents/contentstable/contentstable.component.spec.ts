import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentstableComponent } from './contentstable.component';

describe('ContentstableComponent', () => {
  let component: ContentstableComponent;
  let fixture: ComponentFixture<ContentstableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ContentstableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ContentstableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
