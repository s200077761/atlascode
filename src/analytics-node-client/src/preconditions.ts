'use strict';

const _ = require('lodash');

const tenantTypes = require('./constants/tenant-type');
const userTypes = require('./constants/user-type');
const entityTypes = require('./constants/entity-type');

const {
    CONTAINER_OBJECT_FIELDS_MANDATORY,
    isAllowedContainerObjectField,
    isValidContainerObjectField,
} = require('./constants/container-object-fields');
const { isPlainObject } = require('./utils/object-utils');

export const CONTAINERS_PATH_PREFIX = 'properties.containers';

export function validateOperationalEvent({
    userIdType,
    userId,
    anonymousId,
    tenantIdType,
    tenantId,
    operationalEvent,
}: any) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(operationalEvent, 'operationalEvent');
        requireValue(operationalEvent.source, 'operationalEvent.source');
        requireValue(operationalEvent.action, 'operationalEvent.action');
        requireValue(operationalEvent.actionSubject, 'operationalEvent.actionSubject');
        requireValidContainers(operationalEvent);
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

export function validateTrackEvent({ userIdType, userId, anonymousId, tenantIdType, tenantId, trackEvent }: any) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(trackEvent, 'trackEvent');
        requireValue(trackEvent.source, 'trackEvent.source');
        requireValue(trackEvent.action, 'trackEvent.action');
        requireValue(trackEvent.actionSubject, 'trackEvent.actionSubject');
        requireValidContainers(trackEvent);
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

export function validateUIEvent({ userIdType, userId, anonymousId, tenantIdType, tenantId, uiEvent }: any) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(uiEvent, 'uiEvent');
        requireValue(uiEvent.action, 'uiEvent.action');
        requireValue(uiEvent.actionSubject, 'uiEvent.actionSubject');
        requireValidContainers(uiEvent);
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

export function validateScreenEvent({
    userIdType,
    userId,
    anonymousId,
    tenantIdType,
    tenantId,
    name,
    screenEvent,
}: any) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(name, 'name');
        requireValue(screenEvent, 'screenEvent');
        requireValue(screenEvent.platform, 'screenEvent.platform');
        requireValidContainers(screenEvent);
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

export function validateTraitEvent({ entityType, entityId, entityTraits }: any) {
    try {
        requireValue(entityType, 'entityType');
        requireValue(entityId, 'entityId');
        requireValue(entityTraits, 'entityTraits');
        requireValidEntityData({ entityType, entityTraits });
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

export function requireValidEntityData({ entityType, entityTraits }: any) {
    if (!entityTypes.isValidEntityType(entityType)) {
        throw new Error(`Unknown entityType ${entityType}`);
    }

    if (!_.isObject(entityTraits)) {
        throw new Error('traits.entityTraits should be Object');
    }

    _.forEach(entityTraits, (value: any, key: any) => {
        if (!entityTypes.isValidEntityTraitValue(value)) {
            throw new Error(`entityTraits.${key}: ${value} should be one of [String|Number|Boolean|Date]`);
        }
    });
}

export function requireValidTenantData({ tenantId, tenantIdType }: any) {
    if (tenantId) {
        requireValue(tenantIdType, 'tenantIdType');
    }

    if (tenantIdType) {
        if (!tenantTypes.isValidTenantType(tenantIdType)) {
            throw new Error(`Unknown tenantIdType ${tenantIdType}`);
        }
        if (tenantIdType !== tenantTypes.NONE) {
            requireValue(tenantId, 'tenantId');
        }
    }
}

export function requireValidUserData({ userIdType, userId, anonymousId }: any) {
    validateUserIdType({ userIdType, userId });

    if (!userId && !anonymousId) {
        throw new Error('At least one set of identifiers must be passed - userIdType and userId, or anonymousId');
    }
}

export function validateUserIdType({ userIdType, userId }: any) {
    if (userId) {
        requireValue(userIdType, 'userIdType');
    }

    if (userIdType) {
        if (!userTypes.isValidUserIdType(userIdType)) {
            throw new Error(`Unknown userIdType ${userIdType}`);
        }
        requireValue(userId, 'userId');
    }
}

export function requireValue(value: any, message: any) {
    if (!value) {
        throw new Error(`Value ${message} cannot be undefined`);
    }
    return value;
}

export function requireValidContainers(event: any) {
    if (event && event.containers) {
        const containers = event.containers;
        if (isPlainObject(containers)) {
            const validContainers = {};
            Object.keys(containers).forEach((key) => {
                validContainers[key] = requireValidContainerObject(key, containers);
            });
            event.containers = validContainers;
        } else {
            throw new Error(`"${CONTAINERS_PATH_PREFIX}" is not an object.`);
        }
    }
}

export function requireValidContainerObject(key: any, containers: any) {
    const containerObject = containers[key];
    if (!containerObject) {
        throw new Error(`Container Key "${CONTAINERS_PATH_PREFIX}.${key}" has no ContainerObject.`);
    } else if (isPlainObject(containerObject)) {
        const validContainerObject = {};
        // validate all mandatory fields are there, and the correct type
        _.merge(validContainerObject, validateAllMandatoryFields(containerObject));
        // validate allowed fields are there, and the correct type
        _.merge(validContainerObject, validateAllAllowedFields(containerObject));
        return validContainerObject;
    } else {
        throw new Error(`ContainerObject "${CONTAINERS_PATH_PREFIX}.${key}" is not an object.`);
    }
}

export function validateAllMandatoryFields(containerObject: any) {
    const validContainerObject = {};
    CONTAINER_OBJECT_FIELDS_MANDATORY.forEach((mandatoryField: any) => {
        const value = containerObject[mandatoryField];
        if (isValidContainerObjectField(mandatoryField, value)) {
            validContainerObject[mandatoryField] = value;
        } else {
            throw new Error(
                `Mandatory ContainerObject field "${mandatoryField}" ` +
                    `is not valid: "${value}" ; expected a value of type "string"`
            );
        }
    });
    return validContainerObject;
}

export function validateAllAllowedFields(containerObject: any) {
    const validContainerObject = {};
    Object.keys(containerObject).forEach((field) => {
        const value = containerObject[field];
        if (isAllowedContainerObjectField(field)) {
            if (isValidContainerObjectField(field, value)) {
                validContainerObject[field] = value;
            } else {
                throw new Error(
                    `ContainerObject field "${field}" ` + `is not valid: "${value}" ; expected a value of type "string"`
                );
            }
        }
    });
    return validContainerObject;
}
