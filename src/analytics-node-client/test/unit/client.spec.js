'use strict';

const requireWithMocks = require('proxyquire').noCallThru().noPreserveCache();
const { buildTrackEvent, buildUIEvent, buildScreenEvent, buildOperationalEvent } = require('../helpers/event-builder');

describe('unit/analytics-client', () => {
    const userId = 'my-user-id';
    const userIdType = 'atlassianAccount';
    const tenantId = 'my-tenant-id';
    const tenantIdType = 'cloudId';
    const name = 'my-name';
    const timestamp = new Date('2020-01-28T06:08:35.436Z');
    const entityType = 'ATLASSIAN_ACCOUNT';
    const entityId = '54235:thisiskindaaaid';
    const orgId = 'my-org-id';
    const workspaceId = 'my-workspace-id';

    const mockTrackFn = jasmine.createSpy('track').and.callFake((args, callback) => {
        callback(null, null);
    });
    const mockPageFn = jasmine.createSpy('page').and.callFake((args, callback) => {
        callback(null, null);
    });
    const mockIdentifyFn = jasmine.createSpy('trait').and.callFake((args, callback) => {
        callback(null, null);
    });

    class MockAnalyticsClient {
        constructor() {
            this.track = mockTrackFn;
            this.page = mockPageFn;
            this.identify = mockIdentifyFn;
        }
    }
    const { AnalyticsClient } = requireWithMocks('../../src/client', {
        '@segment/analytics-node': {
            Analytics: MockAnalyticsClient,
        },
    });
    const client = new AnalyticsClient({
        env: 'my-env',
        product: 'my-product',
        subproduct: 'my-subproduct',
        sendEventHook: () => {},
        origin: 'my-origin',
        datacenter: 'my-datacenter',
        version: 'my-version',
    });

    beforeEach(() => {
        mockTrackFn.calls.reset();
        mockPageFn.calls.reset();
        mockIdentifyFn.calls.reset();
        spyOn(client.config, 'sendEventHook').and.callThrough();
    });

    it('calls the segment library with the right track event parameters', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                trackEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the right Operational event parameters', () => {
        const operationalEvent = buildOperationalEvent();
        return client
            .sendOperationalEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                operationalEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'operational',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the right UI event parameters', () => {
        const uiEvent = buildUIEvent();
        return client
            .sendUIEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                uiEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the right screen event parameters', () => {
        const screenEvent = buildScreenEvent();
        return client
            .sendScreenEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                name,
                screenEvent,
            })
            .then(() => {
                expect(mockPageFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        name,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            tags: ['my-tag'],
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockPageFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the right trait event parameters', () => {
        return client
            .sendTraitEvent({
                entityType,
                entityId,
                entityTraits: { one: 'two' },
            })
            .then(() => {
                expect(mockIdentifyFn).toHaveBeenCalledWith(
                    {
                        anonymousId: 'dummy-id',
                        traits: {
                            entityType,
                            entityId,
                            entityTraits: {
                                one: 'two',
                            },
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockIdentifyFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden subproduct on a track event', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                subproduct: 'customSubProduct',
                trackEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden subproduct on a operational event', () => {
        const operationalEvent = buildOperationalEvent();
        return client
            .sendOperationalEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                subproduct: 'customSubProduct',
                operationalEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'operational',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden subproduct on a UI event', () => {
        const uiEvent = buildUIEvent();
        return client
            .sendUIEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                subproduct: 'customSubProduct',
                uiEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden subproduct on a screen event', () => {
        const screenEvent = buildScreenEvent();
        return client
            .sendScreenEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                subproduct: 'customSubProduct',
                name,
                screenEvent,
            })
            .then(() => {
                expect(mockPageFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        name,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            tags: ['my-tag'],
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-event-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockPageFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden anonymousId on a track event', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                anonymousId: 'customAnonymousId',
                trackEvent,
                os: { name: 'FakeOS', version: '-1.32' },
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: 'customAnonymousId',
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: { name: 'FakeOS', version: '-1.32' },
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden anonymousId on a operational event', () => {
        const operationalEvent = buildOperationalEvent();
        return client
            .sendOperationalEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                anonymousId: 'customAnonymousId',
                operationalEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: 'customAnonymousId',
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'operational',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden anonymousId on a UI event', () => {
        const uiEvent = buildUIEvent();
        return client
            .sendUIEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                anonymousId: 'customAnonymousId',
                uiEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: 'customAnonymousId',
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with overridden anonymousId on a screen event', () => {
        const screenEvent = buildScreenEvent();
        return client
            .sendScreenEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                anonymousId: 'customAnonymousId',
                name,
                screenEvent,
            })
            .then(() => {
                expect(mockPageFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: 'customAnonymousId',
                        name,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            tags: ['my-tag'],
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockPageFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the global origin id if not set in the track event parameters', () => {
        const trackEvent = buildTrackEvent();
        delete trackEvent.origin;
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                trackEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the global origin id if not set in the Operational event parameters', () => {
        const operationalEvent = buildOperationalEvent();
        delete operationalEvent.origin;
        return client
            .sendOperationalEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                operationalEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'operational',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the global origin id if not set in the UI event parameters', () => {
        const uiEvent = buildUIEvent();
        delete uiEvent.origin;
        return client
            .sendUIEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                uiEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls the segment library with the global origin id if not set in the screen event parameters', () => {
        const screenEvent = buildScreenEvent();
        delete screenEvent.origin;
        return client
            .sendScreenEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                name,
                screenEvent,
            })
            .then(() => {
                expect(mockPageFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        name,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            tags: ['my-tag'],
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockPageFn).toHaveBeenCalledTimes(1);
            });
    });
    const payload = (eventType) => ({
        userId,
        anonymousId: undefined,
        properties: {
            userIdType: 'atlassianAccount',
            tenantId: 'my-tenant-id',
            tenantIdType: 'cloudId',
            source: 'my-source',
            action: 'my-action',
            actionSubject: 'my-action-subject',
            actionSubjectId: 'my-action-subject-id',
            tags: ['my-tag'],
            containerType: 'my-container-type',
            containerId: 'my-container-id',
            objectType: 'my-object-type',
            objectId: 'my-object-id',
            attributes: {},
            containers: {
                project: {
                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                    type: 'kanban',
                },
                board: {
                    id: 'b5533697-c14c-442b-8773-03da44741831',
                    type: 'public',
                },
            },
            env: 'my-env',
            product: 'my-product',
            subproduct: 'my-subproduct',
            origin: 'my-event-origin',
            datacenter: 'my-datacenter',
            version: 'my-version',
            eventType,
            orgId: undefined,
            workspaceId: undefined,
        },
        timestamp,
        context: {
            os: undefined,
        },
        event: 'my-action-subject my-action',
    });
    it('correctly passes through timestamp when calling the segment library with a ui event', () => {
        const uiEvent = buildUIEvent();
        return client
            .sendUIEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                uiEvent,
                timestamp,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(payload('ui'), jasmine.anything());
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('correctly passes through timestamp when calling the segment library with an operational event', () => {
        const operationalEvent = buildOperationalEvent();
        return client
            .sendOperationalEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                operationalEvent,
                timestamp,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(payload('operational'), jasmine.anything());
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('correctly passes through timestamp when calling the segment library with a screen event', () => {
        const screenEvent = buildScreenEvent();
        return client
            .sendScreenEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                name,
                subproduct: 'customSubProduct',
                screenEvent,
                timestamp,
            })
            .then(() => {
                expect(mockPageFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        name,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            tags: ['my-tag'],
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-event-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                            orgId: undefined,
                            workspaceId: undefined,
                        },
                        timestamp,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockPageFn).toHaveBeenCalledTimes(1);
            });
    });
    it('correctly passes through timestamp when calling the segment library with a track event', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                trackEvent,
                timestamp,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(payload('track'), jasmine.anything());
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
    it('correctly passes through timestamp when calling the segment library with a trait event', () => {
        return client
            .sendTraitEvent({
                entityType,
                entityId,
                entityTraits: { one: 'two' },
                timestamp,
            })
            .then(() => {
                expect(mockIdentifyFn).toHaveBeenCalledWith(
                    {
                        anonymousId: 'dummy-id',
                        traits: {
                            entityType,
                            entityId,
                            entityTraits: {
                                one: 'two',
                            },
                        },
                        timestamp,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockIdentifyFn).toHaveBeenCalledTimes(1);
            });
    });
    it('calls sendEventHook when set', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                trackEvent,
            })
            .then(() => {
                expect(client.config.sendEventHook).toHaveBeenCalledTimes(1);
            });
    });

    it('correctly passes through orgId and workspaceId when calling the segment library with a track even', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                orgId,
                workspaceId,
                trackEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                            orgId: 'my-org-id',
                            workspaceId: 'my-workspace-id',
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });

    it('correctly passes through orgId and workspaceId when calling the segment library with a screen event', () => {
        const screenEvent = buildScreenEvent();
        return client
            .sendScreenEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                orgId,
                workspaceId,
                name,
                screenEvent,
            })
            .then(() => {
                expect(mockPageFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        name,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            tags: ['my-tag'],
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                            orgId: 'my-org-id',
                            workspaceId: 'my-workspace-id',
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                    },
                    jasmine.anything()
                );
                expect(mockPageFn).toHaveBeenCalledTimes(1);
            });
    });

    it('correctly passes through orgId, workspaceId when calling the segment library with a operational event', () => {
        const operationalEvent = buildOperationalEvent();
        return client
            .sendOperationalEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                orgId,
                workspaceId,
                operationalEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'operational',
                            orgId: 'my-org-id',
                            workspaceId: 'my-workspace-id',
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });

    it('correctly passes through orgId and workspaceId when calling the segment library with a ui event', () => {
        const uiEvent = buildUIEvent();
        return client
            .sendUIEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                orgId,
                workspaceId,
                uiEvent,
            })
            .then(() => {
                expect(mockTrackFn).toHaveBeenCalledWith(
                    {
                        userId,
                        anonymousId: undefined,
                        properties: {
                            userIdType: 'atlassianAccount',
                            tenantId: 'my-tenant-id',
                            tenantIdType: 'cloudId',
                            source: 'my-source',
                            action: 'my-action',
                            actionSubject: 'my-action-subject',
                            actionSubjectId: 'my-action-subject-id',
                            tags: ['my-tag'],
                            containerType: 'my-container-type',
                            containerId: 'my-container-id',
                            objectType: 'my-object-type',
                            objectId: 'my-object-id',
                            attributes: {},
                            containers: {
                                project: {
                                    id: 'b1875f21-434f-4d3f-a57c-2962b154d947',
                                    type: 'kanban',
                                },
                                board: {
                                    id: 'b5533697-c14c-442b-8773-03da44741831',
                                    type: 'public',
                                },
                            },
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-event-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                            orgId: 'my-org-id',
                            workspaceId: 'my-workspace-id',
                        },
                        timestamp: undefined,
                        context: {
                            os: undefined,
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
                expect(mockTrackFn).toHaveBeenCalledTimes(1);
            });
    });
});
