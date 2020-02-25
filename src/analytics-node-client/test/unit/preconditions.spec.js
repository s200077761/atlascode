'use strict';

const { buildTrackEvent, buildUIEvent, buildScreenEvent } = require('../helpers/event-builder');
const {
    validateTrackEvent,
    validateUIEvent,
    validateScreenEvent,
    requireValidUserData,
    requireValidTenantData
} = require('../../src/preconditions');

describe('unit/preconditions', () => {
    const userId = 'my-user-id';
    const userIdType = 'atlassianAccount';
    const tenantId = 'my-tenant-id';
    const tenantIdType = 'cloudId';
    const anonymousId = 'my-anonymous-id';

    const trackFields = ['source', 'action', 'actionSubject'];

    const uiFields = ['action', 'actionSubject'];

    const screenFields = ['origin', 'platform'];

    trackFields.forEach(trackField => {
        it(`fails if a track event's ${trackField} is null`, () => {
            const trackEvent = buildTrackEvent({ [trackField]: null });

            return validateTrackEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                trackEvent
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch(err => {
                    expect(err.message).toEqual(`Value trackEvent.${trackField} cannot be undefined`);
                });
        });
    });

    uiFields.forEach(uiField => {
        it(`fails if a UI event's ${uiField} is null`, () => {
            const uiEvent = buildUIEvent({ [uiField]: null });

            return validateUIEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                uiEvent
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch(err => {
                    expect(err.message).toEqual(`Value uiEvent.${uiField} cannot be undefined`);
                });
        });
    });

    screenFields.forEach(screenField => {
        it(`fails if a screen event's ${screenField} is null`, () => {
            const screenEvent = buildScreenEvent({ [screenField]: null });

            return validateScreenEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                name: 'my-name',
                screenEvent
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch(err => {
                    expect(err.message).toEqual(`Value screenEvent.${screenField} cannot be undefined`);
                });
        });
    });

    it('requires that screen events specify a name', () => {
        return validateScreenEvent({
            userId,
            userIdType,
            tenantId,
            tenantIdType,
            screenEvent: buildScreenEvent()
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Value name cannot be undefined');
            });
    });

    it('fails if an unknown userType is specified', () => {
        expect(() => {
            requireValidUserData({
                userId,
                userIdType: 'foobar'
            });
        }).toThrowError('Unknown userIdType foobar');
    });

    it('fails if an unknown tenantIdType is specified', () => {
        expect(() => {
            requireValidTenantData({
                tenantId,
                tenantIdType: 'foobar'
            });
        }).toThrowError('Unknown tenantIdType foobar');
    });

    it('allows null tenantIds if the type is none', () => {
        requireValidTenantData({
            tenantId: null,
            tenantIdType: 'none'
        });
    });

    it('allows events that lack both the tenantId and tenantIdType', () => {
        requireValidTenantData({
            tenantId: undefined,
            tenantIdType: undefined
        });
    });

    it('requires tenantId if the tenantIdType is specified', () => {
        expect(() => {
            requireValidTenantData({
                tenantId: null,
                tenantIdType
            });
        }).toThrowError('Value tenantId cannot be undefined');
    });

    it('requires tenantIdType if the tenantId is specified', () => {
        expect(() => {
            requireValidTenantData({
                tenantId,
                tenantIdType: null
            });
        }).toThrowError('Value tenantIdType cannot be undefined');
    });

    it('does not allow null tenant ids if the tenant type is not none', () => {
        expect(() => {
            requireValidTenantData({
                tenantId: null,
                tenantIdType
            });
        }).toThrowError('Value tenantId cannot be undefined');
    });

    it('allows a null userId if an anonymousId is present', () => {
        requireValidUserData({
            userId: null,
            anonymousId
        });
    });

    it('requires userIds if the userIdType is specified', () => {
        expect(() => {
            requireValidUserData({
                userId: null,
                userIdType
            });
        }).toThrowError('Value userId cannot be undefined');
    });

    it('requires userIdType if the userId is specified', () => {
        expect(() => {
            requireValidUserData({
                userId,
                userIdType: null
            });
        }).toThrowError('Value userIdType cannot be undefined');
    });

    it('does not allow an event that lacks both anonymousId and userId', () => {
        expect(() => {
            requireValidUserData({
                userId: undefined,
                anonymousId: undefined
            });
        }).toThrowError('At least one set of identifiers must be passed - userIdType and userId, or anonymousId');
    });

    it('allows an event to have both an anonymousId and a userId', () => {
        requireValidUserData({
            userId,
            userIdType,
            anonymousId
        });
    });

    it('user data is validated in track events', () => {
        return validateTrackEvent({
            userIdType: 'blah',
            userId
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Unknown userIdType blah');
            });
    });

    it('tenant data is validated in track events', () => {
        return validateTrackEvent({
            userIdType,
            userId,
            tenantId,
            tenantIdType: 'foobar'
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Unknown tenantIdType foobar');
            });
    });

    it('user data is validated in UI events', () => {
        return validateUIEvent({
            userIdType: 'blah',
            userId
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Unknown userIdType blah');
            });
    });

    it('tenant data is validated in UI events', () => {
        return validateUIEvent({
            userIdType,
            userId,
            tenantId,
            tenantIdType: 'foobar'
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Unknown tenantIdType foobar');
            });
    });

    it('user data is validated in screen events', () => {
        return validateScreenEvent({
            userIdType: 'blah',
            userId
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Unknown userIdType blah');
            });
    });

    it('tenant data is validated in screen events', () => {
        return validateScreenEvent({
            userIdType,
            userId,
            tenantId,
            tenantIdType: 'foobar'
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch(err => {
                expect(err.message).toEqual('Unknown tenantIdType foobar');
            });
    });
});
