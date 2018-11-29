declare module '@atlassiansox/analytics-node-client' {

    export interface AnalyticsClientInit {
        env:any;
        product:any;
        subproduct?:any;
        datacenter?:any;
        version?:any;
        origin:any;
        flushAt?:any;
        flushInterval?:any;
        baseUrl?:any;
    }

    export interface BaseEvent {
        userIdType:any;
        userId:any;
        anonymousId?:any;
        tenantIdType:any;
        tenantId?:any;
        subproduct?:any;
        product?:any;
    }

    export interface TrackEvent extends BaseEvent {
        trackEvent:TrackEventData;
    }

    export interface UIEvent extends BaseEvent {
        uiEvent:UIEventData;
    }

    export interface ScreenEvent extends BaseEvent {
        name:any;
        screenEvent:ScreenEventData;
    }

    export interface TrackEventData {
        platform:any,
        origin:any,
        source:any;
        action:any;
        actionSubject:any;
        actionSubjectId?:any;
        attributes?:any;
    }

    export interface UIEventData {
        platform:any,
        origin:any,
        source?:any;
        action:any;
        actionSubject:any;
        actionSubjectId?:any;
        attributes?:any;
    }

    export interface ScreenEventData {
        origin:any;
        platform:any;
        attributes?:any;
    }

    export class AnalyticsClient {
        constructor(args:AnalyticsClientInit);

        sendTrackEvent(event:TrackEvent):Promise<any>

        sendUIEvent(event:UIEvent):Promise<any>

        sendScreenEvent(event:ScreenEvent):Promise<any>

        flush():void;
    }
}