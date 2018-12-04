import { TrackEvent, ScreenEvent, UIEvent } from '@atlassiansox/analytics-node-client';
import { Container } from './container';
import { FeedbackData } from './ipc/configActions';
import { AuthProvider, AuthInfo } from './atlclients/authInfo';
import { ProductJira, ProductBitbucket } from './constants';

export async function installedEvent(version:string):Promise<TrackEvent> {

    const e = {
        tenantIdType:null,
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
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'submitted',
            actionSubject:'atlascodeFeedback',
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

export async function authenticateButtonEvent(source:string):Promise<UIEvent> {
    const e =  {
        tenantIdType:null,
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

export async function viewScreenEvent(screenName:string, tenantId?:string):Promise<ScreenEvent> {
    const e =  {
        tenantIdType:null,
        name:screenName,
        screenEvent:{
            origin:'desktop',
            platform:process.platform,
        }
    };

    
    return await tenantOrNull<ScreenEvent>(e, tenantId).then(async (o) => { return anyUserOrAnonymous<ScreenEvent>(o); });
}

export async function siteSelectedEvent(siteId:string):Promise<TrackEvent> {
    const e = {
        tenantIdType:'cloudId',
        tenantId:siteId,
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'selected',
            actionSubject:'defaultJiraSite',
            actionSubjectId:siteId,
            source:'vscode'
        }
    };
    
    return await anyUserOrAnonymous<TrackEvent>(e);
}

export async function projectSelectedEvent(projectId:string, tenantId:string):Promise<TrackEvent> {
    const e = {
        tenantIdType:'cloudId',
        tenantId:tenantId,
        trackEvent:{
            origin:'desktop',
            platform:process.platform,
            action:'selected',
            actionSubject:'defaultJiraProject',
            actionSubjectId:projectId,
            source:'vscode'
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
        newObj = {...e, ...{userId:userId, userIdType:'atlassianAccount'}};
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
