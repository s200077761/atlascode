'use strict';

const ATLASSIAN_ACCOUNT = 'atlassianAccount';
const TRELLO = 'trello';

function isValidUserIdType(userIdType: string): boolean {
    return userIdType === ATLASSIAN_ACCOUNT || userIdType === TRELLO;
}

export {
    ATLASSIAN_ACCOUNT,
    TRELLO,
    isValidUserIdType
};
