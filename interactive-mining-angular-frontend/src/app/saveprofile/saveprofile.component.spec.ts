import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SaveprofileComponent } from './saveprofile.component';

describe('SaveprofileComponent', () => {
  let component: SaveprofileComponent;
  let fixture: ComponentFixture<SaveprofileComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SaveprofileComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SaveprofileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
