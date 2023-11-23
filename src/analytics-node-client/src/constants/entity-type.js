'use strict';
const _ = require('lodash');
// valid entity ARIs
// https://developer.atlassian.com/platform/targeting/overview/concepts/entities/

// valid entity Types
// eslint-disable-next-line max-len
// https://bitbucket.org/atlassian/tap-catalogue/src/master/src/main/java/com/atlassian/growth/tap/catalogue/model/trait/EntityType.java?at=master

export const AJS_ANONYMOUS_USER = 'AJS_ANONYMOUS_USER';
export const ATLASSIAN_ACCOUNT = 'ATLASSIAN_ACCOUNT';
export const EMAIL_UUID = 'EMAIL_UUID';
export const ORG = 'ORG';
export const SITE = 'SITE';
export const SITE_USER = 'SITE_USER';
export const TRELLO_USER = 'TRELLO_USER';

const validEntityTypes = [AJS_ANONYMOUS_USER, ATLASSIAN_ACCOUNT, EMAIL_UUID, ORG, SITE, SITE_USER, TRELLO_USER];

export function isValidEntityType(entityType) {
    return validEntityTypes.includes(entityType);
}

// should be string, date, boolean, or number
export function isValidEntityTraitValue(value) {
    return _.isFinite(value) || (_.isString(value) && !_.isEmpty(value)) || _.isDate(value) || _.isBoolean(value);
}

const entityTypes = {
    AJS_ANONYMOUS_USER,
    ATLASSIAN_ACCOUNT,
    EMAIL_UUID,
    ORG,
    SITE,
    SITE_USER,
    TRELLO_USER,
    isValidEntityType,
    isValidEntityTraitValue,
};

export { entityTypes };
