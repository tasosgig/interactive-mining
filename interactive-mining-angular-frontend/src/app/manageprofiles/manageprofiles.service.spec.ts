import { TestBed, inject } from '@angular/core/testing';

import { ManageprofilesService } from './manageprofiles.service';

describe('ManageprofilesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ManageprofilesService]
    });
  });

  it('should be created', inject([ManageprofilesService], (service: ManageprofilesService) => {
    expect(service).toBeTruthy();
  }));
});
