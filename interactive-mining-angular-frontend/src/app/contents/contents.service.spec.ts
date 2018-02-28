import { TestBed, inject } from '@angular/core/testing';

import { ContentsService } from './contents.service';

describe('ContentsService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContentsService]
    });
  });

  it('should be created', inject([ContentsService], (service: ContentsService) => {
    expect(service).toBeTruthy();
  }));
});
