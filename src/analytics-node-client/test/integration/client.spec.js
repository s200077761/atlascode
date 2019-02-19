'use strict';

const jasmineHttpServerSpy = require('jasmine-http-server-spy');
const { analyticsClient } = require('../../src/');
const { buildTrackEvent, buildUIEvent, buildScreenEvent } = require('../helpers/event-builder');

describe('integration/send-event', () => {

    let httpSpy;

    beforeAll((done) => {
        httpSpy = jasmineHttpServerSpy.createSpyObj('mockServer', [
            {
                method: 'post',
                url: '/v1/batch',
                handlerName: 'handleEvent'
            }
        ]);
        httpSpy.server.start(8082, done);

        httpSpy.handleEvent.and.returnValue({
            statusCode: 200
        });
    });

    afterAll((done) => {
        httpSpy.server.stop(done);
    });


    afterEach(() => {
        httpSpy.handleEvent.calls.reset();
    });



    it('Sends an event to the server', () => {
        const client = analyticsClient({
            env: 'local',
            product: 'integration-test',
            baseUrl: 'http://localhost:8082'
        });

        const event = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            anonymousId: 'test-anonymous-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            trackEvent: buildTrackEvent()
        };

        return client.sendTrackEvent(event)
            .then(() => client.flush())
            .then(() => {
                expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                    jasmine.objectContaining({
                        body: {
                            batch: [{
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
                                    origin: 'my-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'track',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id'
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything()
                            }],
                            timestamp: jasmine.anything(),
                            sentAt: jasmine.anything()
                        }
                    }));
            });
    });


    it('Sends a UI event to the server', () => {
        const client = analyticsClient({
            env: 'local',
            product: 'integration-test',
            baseUrl: 'http://localhost:8082'
        });

        const uiEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            uiEvent: buildUIEvent()
        };

        return client.sendUIEvent(uiEvent)
            .then(() => client.flush())
            .then(() => {
                expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                    jasmine.objectContaining({
                        body: {
                            batch: [{
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
                                    origin: 'my-origin',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'ui',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id'
                                },
                                type: 'track',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything()
                            }],
                            timestamp: jasmine.anything(),
                            sentAt: jasmine.anything()
                        }
                    }));
            });
    });

    it('Sends a screen event to the server', () => {
        const client = analyticsClient({
            env: 'local',
            product: 'integration-test',
            baseUrl: 'http://localhost:8082'
        });

        const screenEvent = {
            userIdType: 'atlassianAccount',
            userId: 'test-user-id',
            tenantId: 'test-tenant-id',
            tenantIdType: 'cloudId',
            name: 'test-name',
            screenEvent: buildScreenEvent()
        };

        return client.sendScreenEvent(screenEvent)
            .then(() => client.flush())
            .then(() => {
                expect(httpSpy.handleEvent).toHaveBeenCalledWith(
                    jasmine.objectContaining({
                        body: {
                            batch: [{
                                userId: 'test-user-id',
                                name: 'test-name',
                                properties: {
                                    tags: ['my-tag'],
                                    attributes: {},
                                    origin: 'my-origin',
                                    platform: 'my-platform',
                                    product: 'integration-test',
                                    env: 'local',
                                    eventType: 'screen',
                                    userIdType: 'atlassianAccount',
                                    tenantIdType: 'cloudId',
                                    tenantId: 'test-tenant-id'
                                },
                                type: 'page',
                                context: jasmine.anything(),
                                _metadata: jasmine.anything(),
                                timestamp: jasmine.anything(),
                                messageId: jasmine.anything()
                            }],
                            timestamp: jasmine.anything(),
                            sentAt: jasmine.anything()
                        }
                    }));
            });
    });

});
