'use strict';

import * as _ from 'lodash';
const { Analytics } = require('@segment/analytics-node');

const {
    requireValue,
    validateTrackEvent,
    validateTraitEvent,
    validateUIEvent,
    validateScreenEvent,
    validateOperationalEvent,
} = require('./preconditions');

const ANALYTICS_WRITE_KEY = 'BLANK';
const TRACK_EVENT_TYPE = 'track';
const OPERATIONAL_EVENT_TYPE = 'operational';
const UI_EVENT_TYPE = 'ui';
const SCREEN_EVENT_TYPE = 'screen';
const EVENT_ORIGIN = 'server';
const DEFAULT_QUEUE_FLUSH_SIZE = 250;
const DEFAULT_QUEUE_FLUSH_INTERVAL = 10000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 60000;
const MINIMUM_TIMEOUT = 5000;
const FEDRAMP_MODERATE = 'fedramp-moderate';
const PROD = 'prod';
const STG = 'stg';
const ANALYTICS_PATH = '/api/v1/batch';

function isFedrampSandbox(perimeter: any) {
    return perimeter && perimeter === FEDRAMP_MODERATE;
}

function getUrlFromEnvironment(env: any, perimeter: any) {
    if (isFedrampSandbox(perimeter) && env === STG) {
        return 'https://as.atlassian-fex.com/api';
    } else if (env === PROD) {
        return 'https://as.atlassian.com/api';
    } else {
        return 'https://as.staging.atl-paas.net/api';
    }
}

function useDefault(value: any, defaultValue: any) {
    if (value === undefined) {
        return defaultValue;
    }
    return value;
}

export class AnalyticsClient {
    console: any;
    config: { env: any; product: any; subproduct: any; sendEventHook: any; datacenter: any; origin: any; version: any };
    analyticsClient: any;
    static _buildProperties(
        {
            userIdType,
            tenantIdType,
            tenantId,
            event,
            subproduct,
            product,
            env,
            datacenter,
            version,
            origin,
            orgId,
            workspaceId,
        }: any,
        eventType: any
    ) {
        return _.merge({}, event, {
            product,
            env,
            datacenter,
            version,
            eventType,
            subproduct,
            userIdType,
            tenantIdType,
            tenantId,
            origin,
            orgId,
            workspaceId,
        });
    }

    constructor({
        env,
        product,
        subproduct,
        sendEventHook,
        datacenter,
        version,
        origin,
        maxEventsInBatch,
        flushInterval,
        baseUrl,
        logger,
        errorHandler,
        perimeter,
        httpClient,
        httpRequestTimeout,
        maxRetries,
    }: any) {
        requireValue(env, 'env');
        requireValue(product, 'product');
        // eslint-disable-next-line react-hooks/rules-of-hooks
        this.console = useDefault(logger, console);

        this.config = {
            env,
            product,
            subproduct,
            sendEventHook,
            datacenter,
            // eslint-disable-next-line react-hooks/rules-of-hooks
            origin: useDefault(origin, EVENT_ORIGIN),
            version,
        };

        this.analyticsClient = new Analytics({
            writeKey: ANALYTICS_WRITE_KEY,
            maxEventsInBatch: maxEventsInBatch || DEFAULT_QUEUE_FLUSH_SIZE,
            flushInterval: flushInterval || DEFAULT_QUEUE_FLUSH_INTERVAL,
            maxRetries: maxRetries || DEFAULT_MAX_RETRIES,
            host: baseUrl || getUrlFromEnvironment(env, perimeter),
            path: ANALYTICS_PATH,
            httpRequestTimeout,
            httpClient,
        });

        if (errorHandler && typeof errorHandler === 'function') {
            this.analyticsClient.on('error', errorHandler);
        }
    }

    _getTimeoutMilliseconds(timeoutMilliseconds: any) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const timeoutMillisecondsOrDefault = useDefault(timeoutMilliseconds, DEFAULT_TIMEOUT);

        if (timeoutMillisecondsOrDefault < MINIMUM_TIMEOUT) {
            this.console.warn(`timeoutMilliseconds was set less than the allowed minimum of ${MINIMUM_TIMEOUT}.
                    Using the minimum allowed value instead.`);
            return MINIMUM_TIMEOUT;
        }
        return timeoutMillisecondsOrDefault;
    }

    _eventCallback(event: any) {
        if (this.config.sendEventHook) {
            this.config.sendEventHook(event);
        }
    }

    _buildCompleteTrackEvent({
        userIdType,
        userId,
        anonymousId,
        tenantIdType,
        tenantId,
        trackEvent,
        subproduct,
        product,
        os,
        timestamp,
        orgId,
        workspaceId,
    }: any) {
        return {
            userId,
            anonymousId,
            event: trackEvent.actionSubject + ' ' + trackEvent.action,
            properties: AnalyticsClient._buildProperties(
                {
                    userIdType,
                    tenantIdType,
                    tenantId,
                    event: trackEvent,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    subproduct: useDefault(subproduct, this.config.subproduct),
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    product: useDefault(product, this.config.product),
                    env: this.config.env,
                    datacenter: this.config.datacenter,
                    version: this.config.version,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    origin: useDefault(trackEvent.origin, this.config.origin),
                    orgId,
                    workspaceId,
                },
                TRACK_EVENT_TYPE
            ),
            timestamp,
            context: {
                os,
            },
        };
    }

    _buildCompleteTraitEvent({ entityType, entityId, entityTraits, os, timestamp }: any) {
        return {
            // unfortunately one of anonymousId or userId is required
            // https://segment.com/docs/connections/spec/identify/#identities
            // but it is not used by analytic-service. It uses duck-typing
            // for detecting trait events among segment identify events
            // eslint-disable-next-line max-len
            // https://bitbucket.org/atlassian/analytics-service/src/80ecab299404a16fa860c9bee43d2d9913f08396/core/src/main/java/com/atlassian/dataservices/analytics/service/worker/web/converters/EventConvertersService.java?at=master#lines-28
            anonymousId: 'dummy-id',
            traits: {
                entityId,
                entityTraits,
                entityType,
            },
            timestamp,
            context: {
                os,
            },
        };
    }

    _buildCompleteOperationalEvent({
        userIdType,
        userId,
        anonymousId,
        tenantIdType,
        tenantId,
        operationalEvent,
        subproduct,
        product,
        os,
        timestamp,
        orgId,
        workspaceId,
    }: any) {
        return {
            userId,
            anonymousId,
            event: operationalEvent.actionSubject + ' ' + operationalEvent.action,
            properties: AnalyticsClient._buildProperties(
                {
                    userIdType,
                    tenantIdType,
                    tenantId,
                    event: operationalEvent,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    subproduct: useDefault(subproduct, this.config.subproduct),
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    product: useDefault(product, this.config.product),
                    env: this.config.env,
                    datacenter: this.config.datacenter,
                    version: this.config.version,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    origin: useDefault(operationalEvent.origin, this.config.origin),
                    orgId,
                    workspaceId,
                },
                OPERATIONAL_EVENT_TYPE
            ),
            timestamp,
            context: {
                os,
            },
        };
    }
    _buildCompleteUIEvent({
        userIdType,
        userId,
        anonymousId,
        tenantIdType,
        tenantId,
        uiEvent,
        subproduct,
        product,
        os,
        timestamp,
        orgId,
        workspaceId,
    }: any) {
        return {
            userId,
            anonymousId,
            event: uiEvent.actionSubject + ' ' + uiEvent.action,
            properties: AnalyticsClient._buildProperties(
                {
                    userIdType,
                    tenantIdType,
                    tenantId,
                    event: uiEvent,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    subproduct: useDefault(subproduct, this.config.subproduct),
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    product: useDefault(product, this.config.product),
                    env: this.config.env,
                    datacenter: this.config.datacenter,
                    version: this.config.version,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    origin: useDefault(uiEvent.origin, this.config.origin),
                    orgId,
                    workspaceId,
                },
                UI_EVENT_TYPE
            ),
            timestamp,
            context: {
                os,
            },
        };
    }

    _buildScreenEvent({
        userIdType,
        userId,
        anonymousId,
        tenantIdType,
        tenantId,
        name,
        screenEvent,
        subproduct,
        product,
        os,
        timestamp,
        orgId,
        workspaceId,
    }: any) {
        return {
            userId,
            anonymousId,
            name,
            properties: AnalyticsClient._buildProperties(
                {
                    userIdType,
                    tenantIdType,
                    tenantId,
                    event: screenEvent,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    subproduct: useDefault(subproduct, this.config.subproduct),
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    product: useDefault(product, this.config.product),
                    env: this.config.env,
                    datacenter: this.config.datacenter,
                    version: this.config.version,
                    // eslint-disable-next-line react-hooks/rules-of-hooks
                    origin: useDefault(screenEvent.origin, this.config.origin),
                    orgId,
                    workspaceId,
                },
                SCREEN_EVENT_TYPE
            ),
            timestamp,
            context: {
                os,
            },
        };
    }

    sendOperationalEvent({
        userIdType = undefined,
        userId = undefined,
        anonymousId = undefined,
        tenantIdType = undefined,
        tenantId = undefined,
        operationalEvent,
        subproduct = undefined,
        product = undefined,
        os = undefined,
        timestamp = undefined,
        orgId = undefined,
        workspaceId = undefined,
    }: any) {
        return validateOperationalEvent({
            userIdType,
            userId,
            anonymousId,
            tenantIdType,
            tenantId,
            timestamp,
            operationalEvent,
        }).then(
            () =>
                new Promise((resolve, reject) => {
                    const completeEvent = this._buildCompleteOperationalEvent({
                        userIdType,
                        userId,
                        anonymousId,
                        tenantIdType,
                        tenantId,
                        operationalEvent,
                        subproduct,
                        product,
                        os,
                        timestamp,
                        orgId,
                        workspaceId,
                    });
                    this.analyticsClient.track(completeEvent, (error: any, data: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            this._eventCallback(completeEvent);
                            resolve(data);
                        }
                    });
                })
        );
    }

    sendTrackEvent({
        userIdType = undefined,
        userId = undefined,
        anonymousId = undefined,
        tenantIdType = undefined,
        tenantId = undefined,
        trackEvent,
        subproduct = undefined,
        product = undefined,
        os = undefined,
        timestamp = undefined,
        orgId = undefined,
        workspaceId = undefined,
    }: any) {
        return validateTrackEvent({
            userIdType,
            userId,
            anonymousId,
            tenantIdType,
            tenantId,
            timestamp,
            trackEvent,
        }).then(
            () =>
                new Promise((resolve, reject) => {
                    const completeEvent = this._buildCompleteTrackEvent({
                        userIdType,
                        userId,
                        anonymousId,
                        tenantIdType,
                        tenantId,
                        trackEvent,
                        subproduct,
                        product,
                        os,
                        timestamp,
                        orgId,
                        workspaceId,
                    });
                    this.analyticsClient.track(completeEvent, (error: any, data: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            this._eventCallback(completeEvent);
                            resolve(data);
                        }
                    });
                })
        );
    }

    sendTraitEvent({ entityType, entityId, entityTraits, os = undefined, timestamp = undefined }: any) {
        return validateTraitEvent({ entityType, entityId, entityTraits, timestamp }).then(
            () =>
                new Promise((resolve, reject) => {
                    const completeEvent = this._buildCompleteTraitEvent({
                        entityType,
                        entityId,
                        entityTraits,
                        os,
                        timestamp,
                    });
                    this.analyticsClient.identify(completeEvent, (error: any, data: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            this._eventCallback(completeEvent);
                            resolve(data);
                        }
                    });
                })
        );
    }

    sendUIEvent({
        userIdType = undefined,
        userId = undefined,
        anonymousId = undefined,
        tenantIdType = undefined,
        tenantId = undefined,
        uiEvent,
        subproduct = undefined,
        product = undefined,
        os = undefined,
        timestamp = undefined,
        orgId = undefined,
        workspaceId = undefined,
    }: any) {
        return validateUIEvent({ userIdType, userId, anonymousId, tenantIdType, tenantId, timestamp, uiEvent }).then(
            () =>
                new Promise((resolve, reject) => {
                    const completeEvent = this._buildCompleteUIEvent({
                        userIdType,
                        userId,
                        anonymousId,
                        tenantIdType,
                        tenantId,
                        uiEvent,
                        subproduct,
                        product,
                        os,
                        timestamp,
                        orgId,
                        workspaceId,
                    });
                    this.analyticsClient.track(completeEvent, (error: any, data: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            this._eventCallback(completeEvent);
                            resolve(data);
                        }
                    });
                })
        );
    }

    sendScreenEvent({
        userIdType = undefined,
        userId = undefined,
        anonymousId = undefined,
        tenantIdType = undefined,
        tenantId = undefined,
        name = undefined,
        screenEvent,
        subproduct = undefined,
        product = undefined,
        os = undefined,
        timestamp = undefined,
        orgId = undefined,
        workspaceId = undefined,
    }: any) {
        return validateScreenEvent({
            userIdType,
            userId,
            anonymousId,
            tenantIdType,
            tenantId,
            name,
            timestamp,
            screenEvent,
        }).then(
            () =>
                new Promise((resolve, reject) => {
                    const completeEvent = this._buildScreenEvent({
                        userIdType,
                        userId,
                        anonymousId,
                        tenantIdType,
                        tenantId,
                        name,
                        screenEvent,
                        subproduct,
                        product,
                        os,
                        timestamp,
                        orgId,
                        workspaceId,
                    });
                    this.analyticsClient.page(completeEvent, (error: any, data: any) => {
                        if (error) {
                            reject(error);
                        } else {
                            this._eventCallback(completeEvent);
                            resolve(data);
                        }
                    });
                })
        );
    }

    gracefulShutdown() {
        return new Promise((resolve, reject) => {
            this.analyticsClient
                .closeAndFlush()
                .then((data: any) => {
                    resolve(data);
                })
                .catch((err: any) => {
                    reject(err);
                });
        });
    }
}
