'use strict';

const { buildTrackEvent, buildUIEvent, buildScreenEvent, buildOperationalEvent } = require('../helpers/event-builder');
const {
    validateTrackEvent,
    validateUIEvent,
    validateScreenEvent,
    validateOperationalEvent,
    validateTraitEvent,
    requireValidEntityData,
    requireValidUserData,
    requireValidTenantData,
    requireValidContainers,
} = require('../../src/preconditions');

describe('unit/preconditions', () => {
    const userId = 'my-user-id';
    const userIdType = 'atlassianAccount';
    const tenantId = 'my-tenant-id';
    const tenantIdType = 'cloudId';
    const anonymousId = 'my-anonymous-id';
    const entityId = 'my-entity-id';
    const entityType = 'ATLASSIAN_ACCOUNT';

    const operationalFields = ['source', 'action', 'actionSubject'];

    const trackFields = ['source', 'action', 'actionSubject'];

    const uiFields = ['action', 'actionSubject'];

    const screenFields = ['platform'];

    const validFullContainers = {
        project: {
            id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
            type: 'kanban',
        },
        board: {
            id: 'b5533697-c14c-442b-8773-03da44741831',
            type: 'public',
        },
    };

    const validContainersWithoutType = {
        project: {
            id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
        },
        board: {
            id: 'b5533697-c14c-442b-8773-03da44741831',
        },
    };

    const validFullContainersExtraFields = {
        project: {
            id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
            type: 'kanban',
            extraField: 'someValue',
        },
        board: {
            id: 'b5533697-c14c-442b-8773-03da44741831',
            type: 'public',
            anotherField: 'anotherValue',
        },
    };

    const validEmptyContainers = {};

    const validNullContainers = null;

    const invalidContainersWithNullIds = {
        project: {
            id: null,
            type: 'kanban',
        },
        board: {
            id: null,
            type: 'public',
        },
    };

    const invalidContainersWithNoIds = {
        project: {
            type: 'kanban',
        },
        board: {
            type: 'public',
        },
    };

    const invalidContainersEmptyObjects = {
        project: {},
        board: {},
    };

    const invalidContainersNullObjects = {
        project: null,
        board: null,
    };

    const invalidContainersWithInvalidFieldTypes1 = {
        project: {
            id: 4643563,
        },
    };

    const invalidContainersWithInvalidFieldTypes2 = {
        project: {
            id: false,
        },
    };

    const invalidContainersWithInvalidFieldTypes3 = {
        project: {
            id: 'aaaa',
            type: ['invalid', 'wrong'],
        },
    };

    const invalidContainersArrayType = [];

    operationalFields.forEach((operationalField) => {
        it(`fails if a operational event's ${operationalField} is null`, () => {
            const operationalEvent = buildOperationalEvent({ [operationalField]: null });

            return validateOperationalEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                operationalEvent,
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch((err) => {
                    expect(err.message).toEqual(`Value operationalEvent.${operationalField} cannot be undefined`);
                });
        });
    });

    trackFields.forEach((trackField) => {
        it(`fails if a track event's ${trackField} is null`, () => {
            const trackEvent = buildTrackEvent({ [trackField]: null });

            return validateTrackEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                trackEvent,
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch((err) => {
                    expect(err.message).toEqual(`Value trackEvent.${trackField} cannot be undefined`);
                });
        });
    });

    uiFields.forEach((uiField) => {
        it(`fails if a UI event's ${uiField} is null`, () => {
            const uiEvent = buildUIEvent({ [uiField]: null });

            return validateUIEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                uiEvent,
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch((err) => {
                    expect(err.message).toEqual(`Value uiEvent.${uiField} cannot be undefined`);
                });
        });
    });

    screenFields.forEach((screenField) => {
        it(`fails if a screen event's ${screenField} is null`, () => {
            const screenEvent = buildScreenEvent({ [screenField]: null });

            return validateScreenEvent({
                userId,
                userIdType,
                tenantId,
                tenantIdType,
                name: 'my-name',
                screenEvent,
            })
                .then(() => fail('Expected exception to be thrown'))
                .catch((err) => {
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
            screenEvent: buildScreenEvent(),
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Value name cannot be undefined');
            });
    });

    it('requires that trait events specify entityType', () => {
        return validateTraitEvent({
            entityId,
            entityTraits: { foo: 'bar' },
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Value entityType cannot be undefined');
            });
    });

    it('fails if an unknown entityType is specified', () => {
        expect(() => {
            requireValidEntityData({
                entityId,
                entityType: 'foobar',
                entityTraits: { foo: 'bar' },
            });
        }).toThrowError('Unknown entityType foobar');
    });

    it('fails if entityTraits value is Object', () => {
        expect(() => {
            requireValidEntityData({
                entityType,
                entityTraits: { foo: {} },
            });
        }).toThrowError('entityTraits.foo: [object Object] should be one of [String|Number|Boolean|Date]');
    });

    it('fails if entityTraits value is NaN', () => {
        expect(() => {
            requireValidEntityData({
                entityType,
                entityTraits: { foo: NaN },
            });
        }).toThrowError('entityTraits.foo: NaN should be one of [String|Number|Boolean|Date]');
    });

    it('fails if an unknown userType is specified', () => {
        expect(() => {
            requireValidUserData({
                userId,
                userIdType: 'foobar',
            });
        }).toThrowError('Unknown userIdType foobar');
    });

    it('fails if an unknown tenantIdType is specified', () => {
        expect(() => {
            requireValidTenantData({
                tenantId,
                tenantIdType: 'foobar',
            });
        }).toThrowError('Unknown tenantIdType foobar');
    });

    it('allows null tenantIds if the type is none', () => {
        expect(() => {
            requireValidTenantData({
                tenantId: null,
                tenantIdType: 'none',
            });
        }).not.toThrow();
    });

    it('allows events that lack both the tenantId and tenantIdType', () => {
        expect(() => {
            requireValidTenantData({
                tenantId: undefined,
                tenantIdType: undefined,
            });
        }).not.toThrow();
    });

    it('requires tenantId if the tenantIdType is specified', () => {
        expect(() => {
            requireValidTenantData({
                tenantId: null,
                tenantIdType,
            });
        }).toThrowError('Value tenantId cannot be undefined');
    });

    it('requires tenantIdType if the tenantId is specified', () => {
        expect(() => {
            requireValidTenantData({
                tenantId,
                tenantIdType: null,
            });
        }).toThrowError('Value tenantIdType cannot be undefined');
    });

    it('does not allow null tenant ids if the tenant type is not none', () => {
        expect(() => {
            requireValidTenantData({
                tenantId: null,
                tenantIdType,
            });
        }).toThrowError('Value tenantId cannot be undefined');
    });

    it('allows a null userId if an anonymousId is present', () => {
        expect(() => {
            requireValidUserData({
                userId: null,
                anonymousId,
            });
        }).not.toThrow();
    });

    it('requires userIds if the userIdType is specified', () => {
        expect(() => {
            requireValidUserData({
                userId: null,
                userIdType,
            });
        }).toThrowError('Value userId cannot be undefined');
    });

    it('requires userIdType if the userId is specified', () => {
        expect(() => {
            requireValidUserData({
                userId,
                userIdType: null,
            });
        }).toThrowError('Value userIdType cannot be undefined');
    });

    it('does not allow an event that lacks both anonymousId and userId', () => {
        expect(() => {
            requireValidUserData({
                userId: undefined,
                anonymousId: undefined,
            });
        }).toThrowError('At least one set of identifiers must be passed - userIdType and userId, or anonymousId');
    });

    it('allows an event to have both an anonymousId and a userId', () => {
        expect(() => {
            requireValidUserData({
                userId,
                userIdType,
                anonymousId,
            });
        }).not.toThrow();
    });

    it('user data is validated in track events', () => {
        return validateTrackEvent({
            userIdType: 'blah',
            userId,
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Unknown userIdType blah');
            });
    });

    it('tenant data is validated in track events', () => {
        return validateTrackEvent({
            userIdType,
            userId,
            tenantId,
            tenantIdType: 'foobar',
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Unknown tenantIdType foobar');
            });
    });

    it('user data is validated in UI events', () => {
        return validateUIEvent({
            userIdType: 'blah',
            userId,
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Unknown userIdType blah');
            });
    });

    it('tenant data is validated in UI events', () => {
        return validateUIEvent({
            userIdType,
            userId,
            tenantId,
            tenantIdType: 'foobar',
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Unknown tenantIdType foobar');
            });
    });

    it('user data is validated in screen events', () => {
        return validateScreenEvent({
            userIdType: 'blah',
            userId,
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Unknown userIdType blah');
            });
    });

    it('tenant data is validated in screen events', () => {
        return validateScreenEvent({
            userIdType,
            userId,
            tenantId,
            tenantIdType: 'foobar',
        })
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual('Unknown tenantIdType foobar');
            });
    });

    it('containers data is valid for valid full containers', () => {
        expect(() => {
            requireValidContainers({ containers: validFullContainers });
        }).not.toThrow();
    });

    it('containers data is valid for valid containers without type', () => {
        expect(() => {
            requireValidContainers({ containers: validContainersWithoutType });
        }).not.toThrow();
    });

    it('containers data is valid for valid containers with extra fields', () => {
        expect(() => {
            requireValidContainers({ containers: validFullContainersExtraFields });
        }).not.toThrow();
    });

    it('containers data is valid for valid empty containers', () => {
        expect(() => {
            requireValidContainers({ containers: validEmptyContainers });
        }).not.toThrow();
    });

    it('containers data is valid for valid null containers', () => {
        expect(() => {
            requireValidContainers({ containers: validNullContainers });
        }).not.toThrow();
    });

    it('containers data is invalid for containers with null ids', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersWithNullIds });
        }).toThrowError(
            'Mandatory ContainerObject field "id"' + ' is not valid: "null" ; expected a value of type "string"'
        );
    });

    it('containers data is invalid for containers without id', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersWithNoIds });
        }).toThrowError(
            'Mandatory ContainerObject field "id"' + ' is not valid: "undefined" ; expected a value of type "string"'
        );
    });

    it('containers data is invalid for containers with empty objects', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersEmptyObjects });
        }).toThrowError(
            'Mandatory ContainerObject field "id"' + ' is not valid: "undefined" ; expected a value of type "string"'
        );
    });

    it('containers data is invalid for containers with null objects', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersNullObjects });
        }).toThrowError('Container Key "properties.containers.project" has no ContainerObject.');
    });

    it('containers data is invalid for containers with array type', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersArrayType });
        }).toThrowError('"properties.containers" is not an object.');
    });

    it('containers data is invalid for containers with invalid field types 1', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersWithInvalidFieldTypes1 });
        }).toThrowError(
            'Mandatory ContainerObject field "id"' + ' is not valid: "4643563" ; expected a value of type "string"'
        );
    });

    it('containers data is invalid for containers with invalid field types 2', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersWithInvalidFieldTypes2 });
        }).toThrowError(
            'Mandatory ContainerObject field "id"' + ' is not valid: "false" ; expected a value of type "string"'
        );
    });

    it('containers data is invalid for containers with invalid field types 3', () => {
        expect(() => {
            requireValidContainers({ containers: invalidContainersWithInvalidFieldTypes3 });
        }).toThrowError(
            'ContainerObject field "type" is not valid: "invalid,wrong" ;' + ' expected a value of type "string"'
        );
    });
});
