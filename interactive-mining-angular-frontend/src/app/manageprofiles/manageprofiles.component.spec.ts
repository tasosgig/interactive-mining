import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ManageprofilesComponent } from './manageprofiles.component';

describe('ManageprofilesComponent', () => {
  let component: ManageprofilesComponent;
  let fixture: ComponentFixture<ManageprofilesComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ ManageprofilesComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageprofilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });
});
