'use strict';

export const ATLASSIAN_ACCOUNT = 'atlassianAccount';
export const TRELLO = 'trello';
export const HASHED_EMAIL = 'hashedEmail';
export const OPSGENIE = 'opsgenie';
export const HALP = 'halp';
export const CUSTOMER_ACCOUNT = 'customerAccount'; // JSM customer account

export function isValidUserIdType(userIdType: any) {
    const validUserIdTypes = [ATLASSIAN_ACCOUNT, TRELLO, HASHED_EMAIL, OPSGENIE, HALP, CUSTOMER_ACCOUNT];
    return validUserIdTypes.includes(userIdType);
}

const tenantTypes = {
    ATLASSIAN_ACCOUNT,
    TRELLO,
    HASHED_EMAIL,
    OPSGENIE,
    HALP,
    CUSTOMER_ACCOUNT,
    isValidUserIdType,
};

export { tenantTypes };
