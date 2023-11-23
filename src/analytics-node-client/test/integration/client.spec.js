'use strict';

const jasmineHttpServerSpy = require('jasmine-http-server-spy');
const { analyticsClient } = require('../../src/');
const {
    buildTrackEvent,
    buildTrackEventWithContainersExtraFields,
    buildTrackEventNoContainers,
    buildTrackEventWithInvalidContainers,
    buildUIEvent,
    buildScreenEvent,
    buildOperationalEvent,
} = require('../helpers/event-builder');

const ANALYTICS_PATH = '/api/v1/batch';
describe('integration/send-event', () => {
    let httpSpy;
    let client;

    beforeAll((done) => {
        httpSpy = jasmineHttpServerSpy.createSpyObj('mockServer', [
            {
                method: 'post',
                url: ANALYTICS_PATH,
                handlerName: 'handleEvent',
            },
        ]);
        httpSpy.server.start(8082, done);

        httpSpy.handleEvent.and.returnValue({
            statusCode: 200,
        });
    });

    beforeEach(() => {
        client = analyticsClient({
            env: 'local',
            product: 'integration-test',
            baseUrl: 'http://localhost:8082',
            maxEventsInBatch: 1,
        });
    });

    afterAll((done) => {
        httpSpy.server.stop(done);
    });

    afterEach(() => {
        httpSpy.handleEvent.calls.reset();
    });

    it('Sends a basic track event to the server', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            trackEvent: buildTrackEvent(),
        };

        return client.sendTrackEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'track',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a track event to the server removing extra fields from containers', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            trackEvent: buildTrackEventWithContainersExtraFields(),
        };

        return client.sendTrackEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'track',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a track event without containers to the server', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            trackEvent: buildTrackEventNoContainers(),
        };

        return client.sendTrackEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'track',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Error when sending a track event with invalid containers to the server', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            trackEvent: buildTrackEventWithInvalidContainers(),
        };

        return client
            .sendTrackEvent(event)
            .then(() => fail('Expected exception to be thrown'))
            .catch((err) => {
                expect(err.message).toEqual(
                    'ContainerObject field "type" is not valid: "invalid,wrong" ;' +
                        +' expected a value of type "string"'
                );
            });
    });

    it('Sends a track event to the server with orgId', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            orgId: 'test-org-id',
            trackEvent: buildTrackEvent(),
        };

        return client.sendTrackEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'track',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                    orgId: 'test-org-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a track event to the server with workspaceId', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            workspaceId: 'test-workspace-id',
            trackEvent: buildTrackEvent(),
        };

        return client.sendTrackEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'track',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                    workspaceId: 'test-workspace-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a basic operational event to the server', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            operationalEvent: buildOperationalEvent(),
        };

        return client.sendOperationalEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'operational',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a operational event to the server with orgId and workspaceId', () => {
        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            orgId: 'test-org-Id',
            workspaceId: 'test-workspace-id',
            operationalEvent: buildOperationalEvent(),
        };

        return client.sendOperationalEvent(event).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                anonymousId: 'test-anonymous-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'operational',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                    orgId: 'test-org-Id',
                                    workspaceId: 'test-workspace-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a basic UI event to the server', () => {
        const uiEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            uiEvent: buildUIEvent(),
        };

        return client.sendUIEvent(uiEvent).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                event: 'my-action-subject my-action',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'ui',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a basic screen event to the server', () => {
        const screenEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            name: 'test-name',
            screenEvent: buildScreenEvent(),
        };

        return client.sendScreenEvent(screenEvent).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                name: 'test-name',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    platform: 'my-platform',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'screen',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                },
                                type: 'page',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a trait event to the server', () => {
        const traitEvent = {
            entityType: 'ATLASSIAN_ACCOUNT',
            entityId: '54235:thisiskindaaaid',
            entityTraits: { one: 'two' },
        };

        return client.sendTraitEvent(traitEvent).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                anonymousId: 'dummy-id',
                                traits: {
                                    entityId: '54235:thisiskindaaaid',
                                    entityTraits: { one: 'two' },
                                    entityType: 'ATLASSIAN_ACCOUNT',
                                },
                                type: 'identify',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Sends a screen event to the server with orgId and workspaceId', () => {
        const screenEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            orgId: 'test-org-id',
            workspaceId: 'test-workspace-id',
            name: 'test-name',
            screenEvent: buildScreenEvent(),
        };

        return client.sendScreenEvent(screenEvent).then(() => {
            expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    body: {
                        batch: [
                            {
                                userId: 'test-user-id',
                                name: 'test-name',
                                properties: {
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
                                    origin: 'my-event-origin',
                                    platform: 'my-platform',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'screen',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id',
                                    orgId: 'test-org-id',
                                    workspaceId: 'test-workspace-id',
                                },
                                type: 'page',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything(),
                                integrations: jasmine.anything(),
                            },
                        ],
                        sentAt: jasmine.anything(),
                    },
                })
            );
        });
    });

    it('Calls the sendEventHook callback if set', () => {
        const client = analyticsClient({
            env: 'local',
            product: 'integration-test',
            baseUrl: 'http://localhost:8082',
            maxEventsInBatch: 1,
            sendEventHook: () => {},
        });

        spyOn(client.config, 'sendEventHook').and.callThrough();

        const screenEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            name: 'test-name',
            screenEvent: buildScreenEvent(),
        };

        return client.sendScreenEvent(screenEvent).then(() => {
            expect(client.config.sendEventHook).toHaveBeenCalledTimes(1);
        });
    });
});

describe('integration/error-handling', () => {
    let httpSpy;

    beforeAll((done) => {
        httpSpy = jasmineHttpServerSpy.createSpyObj('mockServer', [
            {
                method: 'post',
                url: ANALYTICS_PATH,
                handlerName: 'handleEvent',
            },
        ]);
        httpSpy.server.start(8082, done);

        httpSpy.handleEvent.and.returnValue({
            statusCode: 429,
        });
    });

    afterAll((done) => {
        httpSpy.server.stop(done);
    });

    afterEach(() => {
        httpSpy.handleEvent.calls.reset();
    });

    it('Calls the sendEventHook callback if set', async () => {
        const errorHandler = jasmine.createSpy('errorHandler');
        const client = analyticsClient({
            env: 'local',
            product: 'integration-test',
            baseUrl: 'http://localhost:8082',
            maxEventsInBatch: 1,
            sendEventHook: () => {},
            errorHandler,
        });

        const screenEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            name: 'test-name',
            screenEvent: buildScreenEvent(),
        };
        try {
            await client.sendScreenEvent(screenEvent);
        } catch (error) {
            errorHandler(error);
        }

        expect(errorHandler).toHaveBeenCalledTimes(1);
    });
});
