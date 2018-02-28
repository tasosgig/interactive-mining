import { TestBed, inject } from '@angular/core/testing';

import { SaveprofileService } from './saveprofile.service';

describe('SaveprofileService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SaveprofileService]
    });
  });

  it('should be created', inject([SaveprofileService], (service: SaveprofileService) => {
    expect(service).toBeTruthy();
  }));
});
