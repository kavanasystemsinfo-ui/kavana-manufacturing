import { SetMetadata } from '@nestjs/common';

export const REQUIRED_FEATURE_KEY = 'REQUIRED_FEATURE';

export const RequireFeature = (moduleKey: string) =>
  SetMetadata(REQUIRED_FEATURE_KEY, moduleKey);
