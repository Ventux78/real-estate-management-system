/**
 * Property Module — Barrel Export
 *
 * Public API surface for the Property module.
 * External files should import from @/modules/property.
 */

export { default as propertyRouter } from './property.routes';
export type { PropertyDto, PropertyImageDto, PaginatedPropertyResult } from './property.types';
