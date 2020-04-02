import { ExtensionContext } from 'vscode';
import { parse, format, addMonths, subMonths, addWeeks, addDays, isAfter, isBefore } from 'date-fns';

const PmfStatsKey = 'pmfStats';
const FormatYYYYMMDD = 'YYYY-MM-DD';
const FormatISO = 'YYYY-MM-DD[T]HH:mm:ssZ';

type PmfStatsData = {
    lastSurveyed: string;
    snoozeUntil: string;
    activityByDay: {
        [k: string]: number;
    };
};

const fallbackData: PmfStatsData = {
    lastSurveyed: format(subMonths(new Date(), 6), FormatYYYYMMDD),
    snoozeUntil: format(new Date(), FormatISO),
    activityByDay: {}
};

export class PmfStats {
    constructor(private extensionContext: ExtensionContext) {
        this.cleanupOldEntries();
    }

    shouldShowSurvey(): boolean {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();

        if (isAfter(addMonths(parse(currentState.lastSurveyed), 3), now)) {
            return false;
        }

        if (isAfter(currentState.snoozeUntil, now)) {
            return false;
        }

        const daysActiveInLastTwoWeeks = Object.keys(currentState.activityByDay)
            .filter(key => isAfter(addWeeks(parse(key), 2), now))
            .reduce((prevSum, currKey) => prevSum + currentState.activityByDay[currKey], 0);

        return daysActiveInLastTwoWeeks >= 3;
    }

    async snoozeSurvey() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();

        currentState.snoozeUntil = format(addDays(now, 1), FormatISO);
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    async touchSurveyed() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();
        const today = format(now, FormatYYYYMMDD);

        currentState.lastSurveyed = today;
        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }

    async touchActivity() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();
        const today = format(now, FormatYYYYMMDD);

        if (!currentState.activityByDay[today]) {
            currentState.activityByDay[today] = 1;
            await this.extensionContext.globalState.update(PmfStatsKey, currentState);
        }
    }

    async cleanupOldEntries() {
        const currentState = this.extensionContext.globalState.get<PmfStatsData>(PmfStatsKey, fallbackData);

        const now = new Date();

        Object.keys(currentState.activityByDay)
            .filter(key => isBefore(addWeeks(parse(key), 2), now))
            .forEach(key => delete currentState.activityByDay[key]);

        await this.extensionContext.globalState.update(PmfStatsKey, currentState);
    }
}
