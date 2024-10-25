// import FeatureFlagClient, { AnalyticsClientInterface, EnvironmentType, FeatureExposedEventType, LogLevel } from '@atlassiansox/feature-flag-web-client';
// import { Container } from './container';
import { AnalyticsClient } from '../../analytics-node-client/src/client.min';

import FeatureGates, { FeatureGateEnvironment, Identifiers } from '@atlaskit/feature-gate-js-client';
import { AnalyticsClientMapper } from './analytics';
import { Features } from './features';

export type FeatureFlagClientOptions = {
    analyticsClient: AnalyticsClient;
    identifiers: Identifiers;
};

export class FeatureFlagClient {
    private static analyticsClient: AnalyticsClientMapper;

    public static async initialize(options: FeatureFlagClientOptions): Promise<void> {
        const targetApp = process.env.ATLASCODE_FX3_TARGET_APP || '';
        const environment =
            (process.env.ATLASCODE_FX3_ENVIRONMENT as FeatureGateEnvironment) || FeatureGateEnvironment.Production;

        console.log(`FeatureGates: initializing, target: ${targetApp}, environment: ${environment}`);
        this.analyticsClient = new AnalyticsClientMapper(options.analyticsClient, options.identifiers);

        return FeatureGates.initialize(
            {
                apiKey: process.env.ATLASCODE_FX3_API_KEY || '',
                environment,
                targetApp,
                fetchTimeoutMs: Number.parseInt(process.env.ATLASCODE_FX3_TIMEOUT || '2000'),
                analyticsWebClient: Promise.resolve(this.analyticsClient),
            },
            options.identifiers,
        )
            .then(() => {
                console.log(`FeatureGates: client initialized!`);
            })
            .catch((err) => {
                console.warn(`FeatureGates: Failed to initialize client. ${err}`);
                console.warn('FeatureGates: Disabling feature flags');
            });
    }

    public static async checkGate(gate: string) {
        const gateValue = FeatureGates.checkGate(gate);
        console.log(`FeatureGates: ${gate} -> ${gateValue}`);
        return gateValue;
    }

    public static async evaluateFeatures() {
        const featureFlags = await Promise.all(
            Object.values(Features).map(async (feature) => {
                return {
                    [feature]: await this.checkGate(feature),
                };
            }),
        );

        return featureFlags.reduce((acc, val) => ({ ...acc, ...val }), {});
    }
}
