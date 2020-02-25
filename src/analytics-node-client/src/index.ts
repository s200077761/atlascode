'use strict';

import { TrackEvent, UIEvent, ScreenEvent } from './types';
import { AnalyticsClient } from './client';
import * as tenantTypes from './constants/tenant-type';
import * as userTypes from './constants/user-type';

function analyticsClient(args: any) {
    return new AnalyticsClient(args);
}

export { TrackEvent, UIEvent, ScreenEvent, analyticsClient, AnalyticsClient, tenantTypes, userTypes };
