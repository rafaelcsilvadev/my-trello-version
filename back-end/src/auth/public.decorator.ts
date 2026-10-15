import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC = 'isPublic';

// Marks a controller or handler as reachable without an access token (BE-AD-006).
export const Public = () => SetMetadata(IS_PUBLIC, true);
