'use strict';

export const CLOUD_ID = 'cloudId';
export const HALP_TEAM_ID = 'halpTeamId';
export const NONE = 'none';

export function isValidTenantType(tenantIdType: any) {
    return tenantIdType === CLOUD_ID || tenantIdType === HALP_TEAM_ID || tenantIdType === NONE;
}
const tenantTypes = {
    CLOUD_ID,
    HALP_TEAM_ID,
    NONE,
    isValidTenantType,
};

export { tenantTypes };
