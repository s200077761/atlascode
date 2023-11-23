'use strict';

const _ = require('lodash');

function buildOperationalEvent(mergeEvent) {
    return _.merge(
        {},
        {
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
        },
        mergeEvent
    );
}

function buildTrackEvent(mergeEvent) {
    return _.merge(
        {},
        {
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
        },
        mergeEvent
    );
}

function buildTrackEventWithContainersExtraFields(mergeEvent) {
    return _.merge(
        {},
        {
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
                    extraField: 'extraValue',
                },
                board: {
                    id: 'b5533697-c14c-442b-8773-03da44741831',
                    type: 'public',
                    anotherField: 'anotherValue',
                },
            },
            origin: 'my-event-origin',
        },
        mergeEvent
    );
}

function buildTrackEventWithInvalidContainers(mergeEvent) {
    return _.merge(
        {},
        {
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
                    type: ['invalid', 'wrong'],
                },
            },
            origin: 'my-event-origin',
        },
        mergeEvent
    );
}

function buildTrackEventNoContainers(mergeEvent) {
    return _.merge(
        {},
        {
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
        },
        mergeEvent
    );
}

function buildUIEvent(mergeEvent) {
    return _.merge(
        {},
        {
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
        },
        mergeEvent
    );
}

function buildScreenEvent(mergeEvent) {
    return _.merge(
        {},
        {
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
        },
        mergeEvent
    );
}

module.exports = {
    buildTrackEvent,
    buildTrackEventWithContainersExtraFields,
    buildTrackEventNoContainers,
    buildTrackEventWithInvalidContainers,
    buildUIEvent,
    buildScreenEvent,
    buildOperationalEvent,
};
