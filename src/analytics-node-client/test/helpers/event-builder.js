'use strict';

function buildTrackEvent(mergeEvent) {
    return Object.assign({}, {
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
        origin: 'my-origin'
    }, mergeEvent);
}

function buildUIEvent(mergeEvent) {
    return Object.assign({}, {
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
        origin: 'my-origin'
    }, mergeEvent);
}

function buildScreenEvent(mergeEvent) {
    return Object.assign({}, {
        tags: ['my-tag'],
        attributes: {},
        origin: 'my-origin',
        platform: 'my-platform'
    }, mergeEvent);
}

module.exports = {
    buildTrackEvent,
    buildUIEvent,
    buildScreenEvent
};
