'use strict';

export const CONTAINER_OBJECT_FIELD_ID = 'id';
export const CONTAINER_OBJECT_FIELD_TYPE = 'type';

export const CONTAINER_OBJECT_FIELDS_ALLOWED = [CONTAINER_OBJECT_FIELD_ID, CONTAINER_OBJECT_FIELD_TYPE];

export const CONTAINER_OBJECT_FIELDS_MANDATORY = [CONTAINER_OBJECT_FIELD_ID];

export function isAllowedContainerObjectField(fieldName) {
    return CONTAINER_OBJECT_FIELDS_ALLOWED.some((f) => f === fieldName);
}

export function isValidContainerObjectField(fieldName, fieldValue) {
    return CONTAINER_OBJECT_FIELDS_ALLOWED.some((f) => f === fieldName) && typeof fieldValue === 'string';
}
