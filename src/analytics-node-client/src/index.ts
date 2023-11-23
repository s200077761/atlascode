'use strict';
import { TrackEvent, UIEvent, ScreenEvent } from './types';
import { AnalyticsClient } from './client';

import { tenantTypes } from './constants/tenant-type';
const { userTypes } = require('./constants/user-type');
const entityTypes = require('./constants/entity-type');

export function analyticsClient(args: any) {
    return new AnalyticsClient(args);
}

export { TrackEvent, UIEvent, ScreenEvent, AnalyticsClient, tenantTypes, userTypes, entityTypes };
