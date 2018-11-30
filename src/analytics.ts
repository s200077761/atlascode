import { TrackEvent, UIEvent } from '@atlassiansox/analytics-node-client';
import { Container } from './container';
import { FeedbackData } from './ipc/configActions';
import { AuthProvider, AuthInfo } from './atlclients/authInfo';
import { ProductJira, ProductBitbucket } from './constants';

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

export async function authenticateButtonEvent(source:string):Promise<UIEvent> {
    const e =  {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        uiEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'clicked',
            actionSubject:'button',
            actionSubjectId:'authenticateButton',
            source:source
        }
    };

    return await anyUserOrAnonymous<UIEvent>(e);
}

export async function logoutButtonEvent(source:string):Promise<UIEvent> {
    const e =  {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        uiEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'clicked',
            actionSubject:'button',
            actionSubjectId:'logoutButton',
            source:source
        }
    };

    return await anyUserOrAnonymous<UIEvent>(e);
}

export async function authenticatedEvent(hostProduct:string):Promise<TrackEvent> {

    const e = {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'authenticated',
            actionSubject:'atlascode',
            source:'vscode',
            attributes: {machineId:Container.machineId, hostProduct:hostProduct},
        }
    };

    return await anyUserOrAnonymous<TrackEvent>(e);
}

export async function loggedOutEvent(hostProduct:string):Promise<TrackEvent> {

    const e = {
        tenantIdType:null,
        userIdType:'atlassianAccount',
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'unauthenticated',
            actionSubject:'atlascode',
            source:'vscode',
            attributes: {machineId:Container.machineId, hostProduct:hostProduct},
        }
    };

    return await anyUserOrAnonymous<TrackEvent>(e);
}

async function anyUserOrAnonymous<T>(e:Object, hostProduct?:string):Promise<T> {
    let userType = 'anonymousId';
    let userId = Container.machineId;
    let authInfo:AuthInfo|undefined = undefined;
    
    let newObj:Object;

    switch(hostProduct) {
        case undefined: 
        default: {
            authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
            if(!authInfo) {
                authInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);
            }
            break;
        }
        case ProductJira: {
            authInfo = await Container.authManager.getAuthInfo(AuthProvider.JiraCloud);
            break;
        }
        case ProductBitbucket: {
            authInfo = await Container.authManager.getAuthInfo(AuthProvider.BitbucketCloud);
            break;
        }
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