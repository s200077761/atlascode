'use strict';

const requireWithMocks = require('proxyquire').noCallThru().noPreserveCache();
const { buildTrackEvent, buildUIEvent, buildScreenEvent } = require('../helpers/event-builder');

describe('unit/analytics-client', () => {
    const userId = 'my-user-id';
    const userIdType = 'atlassianAccount';
    const tenantId = 'my-tenant-id';
    const tenantIdType = 'cloudId';
    const name = 'my-name';
    const mockTrackFn = jasmine.createSpy('track').and.callFake((args, callback) => {
        callback(null, {});
    });
    const mockScreenFn = jasmine.createSpy('page').and.callFake((args, callback) => {
        callback(null, {});
    });

    function MockAnalyticsClient() {
        return {
            track: mockTrackFn,
            page: mockScreenFn,
        };
    }
    const { AnalyticsClient } = requireWithMocks('../../src/client', {
        'analytics-node': MockAnalyticsClient,
    });
    const client = new AnalyticsClient({
        env: 'my-env',
        product: 'my-product',
        subproduct: 'my-subproduct',
        origin: 'my-origin',
        datacenter: 'my-datacenter',
        version: 'my-version',
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
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
                expect(mockScreenFn).toHaveBeenCalledWith(
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                        },
                    },
                    jasmine.anything()
                );
            });
    });
    it('calls the segment library with overriden subproduct on a track event', () => {
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
            });
    });
    it('calls the segment library with overriden subproduct on a UI event', () => {
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
            });
    });
    it('calls the segment library with overriden subproduct on a screen event', () => {
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
                expect(mockScreenFn).toHaveBeenCalledWith(
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'customSubProduct',
                            origin: 'my-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                        },
                    },
                    jasmine.anything()
                );
            });
    });
    it('calls the segment library with overriden anonymousId on a track event', () => {
        const trackEvent = buildTrackEvent();
        return client
            .sendTrackEvent({
                userId,
                userIdType,
                tenantIdType,
                tenantId,
                anonymousId: 'customAnonymousId',
                trackEvent,
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'track',
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
            });
    });
    it('calls the segment library with overriden anonymousId on a UI event', () => {
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'ui',
                        },
                        event: 'my-action-subject my-action',
                    },
                    jasmine.anything()
                );
            });
    });
    it('calls the segment library with overriden anonymousId on a screen event', () => {
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
                expect(mockScreenFn).toHaveBeenCalledWith(
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
                            env: 'my-env',
                            product: 'my-product',
                            subproduct: 'my-subproduct',
                            origin: 'my-origin',
                            platform: 'my-platform',
                            datacenter: 'my-datacenter',
                            version: 'my-version',
                            eventType: 'screen',
                        },
                    },
                    jasmine.anything()
                );
            });
    });
});
