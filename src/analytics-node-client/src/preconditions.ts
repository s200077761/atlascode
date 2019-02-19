'use strict';

import { TrackEvent, UIEvent, ScreenEvent } from "./types";
import * as tenantTypes from './constants/tenant-type';
import * as userTypes from './constants/user-type';

function validateTrackEvent({ userIdType, userId, anonymousId, tenantIdType, tenantId, trackEvent }: TrackEvent) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(trackEvent, 'trackEvent');
        requireValue(trackEvent.source, 'trackEvent.source');
        requireValue(trackEvent.action, 'trackEvent.action');
        requireValue(trackEvent.actionSubject, 'trackEvent.actionSubject');
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

function validateUIEvent({ userIdType, userId, anonymousId, tenantIdType, tenantId, uiEvent }: UIEvent) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(uiEvent, 'uiEvent');
        requireValue(uiEvent.action, 'uiEvent.action');
        requireValue(uiEvent.actionSubject, 'uiEvent.actionSubject');
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

function validateScreenEvent({ userIdType, userId, anonymousId, tenantIdType, tenantId, name, screenEvent }: ScreenEvent) {
    try {
        requireValidUserData({ userIdType, userId, anonymousId });
        requireValidTenantData({ tenantId, tenantIdType });
        requireValue(name, 'name');
        requireValue(screenEvent, 'screenEvent');
        requireValue(screenEvent.origin, 'screenEvent.origin');
        requireValue(screenEvent.platform, 'screenEvent.platform');
        return Promise.resolve();
    } catch (err) {
        return Promise.reject(err);
    }
}

function requireValidTenantData({ tenantId, tenantIdType }: { tenantId: string, tenantIdType: string }) {
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

function requireValidUserData({ userIdType, userId, anonymousId }: { userIdType: string, userId?: string, anonymousId?: string }) {
    validateUserIdType({ userIdType, userId });

    if (!userId && !anonymousId) {
        throw new Error(
            'At least one set of identifiers must be passed - userIdType and userId, or anonymousId'
        );
    }
}

function validateUserIdType({ userIdType, userId }: { userIdType: string, userId?: string }) {
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

function requireValue(value: any, message: string) {
    if (!value) {
        throw new Error(`Value ${message} cannot be undefined`);
    }
    return value;
}

export {
    requireValue,
    validateTrackEvent,
    validateUIEvent,
    validateScreenEvent,
    requireValidUserData,
    requireValidTenantData
};
