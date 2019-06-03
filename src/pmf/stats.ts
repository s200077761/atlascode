import { ExtensionContext, Disposable } from 'vscode';
import moment from 'moment';

const PmfStatsKey = 'pmfStats';
const FormatYYYYMMDD = 'YYYY-MM-DD';

type PmfStatsData = {
    lastSurveyed: string;
    snoozeUntil: string;
    activityByDay: {
        [k: string]: number;
    }
};

const fallbackData: PmfStatsData = {
    lastSurveyed: moment.utc().subtract(6, 'months').format(FormatYYYYMMDD),
    snoozeUntil: moment.utc().toISOString(),
    activityByDay: {}
};

export class PmfStats implements Disposable {
    constructor(private extensionContext: ExtensionContext) { }

    shouldShowSurvey(): boolean {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = moment.utc();

        if (moment.utc(currentState.lastSurveyed, FormatYYYYMMDD).add(3, 'months').isAfter(now)) {
            return false;
        }

        if (moment.utc(currentState.snoozeUntil, moment.ISO_8601).isAfter(now)) {
            return false;
        }

        const daysActiveInLastTwoWeeks = Object.keys(currentState.activityByDay)
            .filter(key => moment.utc(key, FormatYYYYMMDD).add(2, 'weeks').isAfter(now))
            .reduce((prevSum, currKey) => prevSum + currentState.activityByDay[currKey], 0);

        return daysActiveInLastTwoWeeks >= 3;
    }

    async snoozeSurvey() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = moment.utc();

        currentState.snoozeUntil = now.add(1, 'day').toISOString();
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    async touchSurveyed() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = moment.utc();
        const today = now.format(FormatYYYYMMDD);

        currentState.lastSurveyed = today;
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    async touchActivity() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = moment.utc();
        const today = now.format(FormatYYYYMMDD);

        if (!currentState.activityByDay[today]) {
            currentState.activityByDay[today] = 1;
            await this.extensionContext.globalState.update(PmfStatsKey, currentState);
        }
    }

    cleanupOldEntries() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = moment.utc();

        Object.keys(currentState.activityByDay)
            .filter(key => moment.utc(key, FormatYYYYMMDD).add(2, 'weeks').isBefore(now))
            .forEach(key => delete currentState.activityByDay[key]);
    }

    dispose() {
        this.cleanupOldEntries();
    }
}