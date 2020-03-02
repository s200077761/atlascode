'use strict';

const CLOUD_ID = 'cloudId';
const NONE = 'none';

function isValidTenantType(tenantIdType: string): boolean {
    return tenantIdType === CLOUD_ID || tenantIdType === NONE;
}

export { CLOUD_ID, NONE, isValidTenantType };
