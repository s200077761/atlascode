import { TrackEvent, ScreenEvent } from '@atlassiansox/analytics-node-client';
import { Container } from './container';
import { FeedbackData } from './ipc/configActions';
import { AuthProvider } from './atlclients/authInfo';

export async function installedEvent(version:string):Promise<TrackEvent> {

    const e = {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'installed',
            actionSubject:'atlascode',
            source:'vscode',
            attributes: {machineId:Container.machineId, version:version},
        }
    };

    return await anyUserOrAnonymous<TrackEvent>(e);
}

export async function upgradedEvent(version:string, previousVersion:string):Promise<TrackEvent> {
    const e = {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'upgraded',
            actionSubject:'atlascode',
            source:'vscode',
            attributes: {machineId:Container.machineId, version:version, previousVersion:previousVersion},
        }
    };

    return await anyUserOrAnonymous<TrackEvent>(e);
}

export async function feedbackEvent(feedback:FeedbackData, source:string):Promise<TrackEvent> {
    const e =  {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'submitted',
            actionSubject:'feedback',
            source:source,
            attributes: {feedback:feedback.description,feedbackType:feedback.type,canContact:feedback.canBeContacted},
        }
    };

    return await anyUserOrAnonymous<TrackEvent>(e);
}

export async function featureChangeEvent(featureId:string,enabled:boolean):Promise<TrackEvent> {
    let action = enabled ? 'enabled' : 'disabled';
    const e =  {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:action,
            actionSubject:'feature',
            actionSubjectId:featureId,
            source:'atlascodeSettings'
        }
    };

    return await anyUserOrAnonymous<TrackEvent>(e);
}

export async function viewScreenEvent(screenName:string, tenantId?:string):Promise<ScreenEvent> {
    const e =  {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        name:screenName,
        screenEvent:{
            origin:'desktop',
            platform:process.platform,
        }
    };

    
    return await tenantOrNull<ScreenEvent>(e, tenantId).then(async (o) => { return anyUserOrAnonymous<ScreenEvent>(o); });
}

async function anyUserOrAnonymous<T>(e:Object):Promise<T> {
    let userType = 'anonymousId';
    let userId = Container.machineId;
    let newObj:Object;

    let authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
    if(!authInfo) {
        authInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);
    }

    if(authInfo) {
        userType = 'userId';
        userId = authInfo.user.id;
    }

    if(userType === 'userId') {
        newObj = {...e, ...{userId:userId}};
    } else {
        newObj = {...e, ...{anonymousId:userId}};
    }

    return newObj as T;
}

async function tenantOrNull<T>(e:Object, tenantId?:string):Promise<T> {
    let tenantType:string|null = 'cloudId';
    let newObj:Object;

    if(!tenantId) {
        tenantType = null;
    }
    newObj = {...e, ...{tenantIdType:tenantType, tenantId:tenantId}};

    return newObj as T;
}
