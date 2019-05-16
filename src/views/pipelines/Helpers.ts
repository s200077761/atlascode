import { Container } from "../../container";

/**
 * Determines whether or not a branch name should be displayed according to the filtering
 * preferences of the user.
 * @param branchName The branch name to test.
 */
export function shouldDisplay(branchName: string): boolean {
    if (!Container.config.bitbucket.pipelines.hideFiltered) {
        return true;
    }

    const filters = Container.config.bitbucket.pipelines.branchFilters.filter(f => f.length > 0);
    const reString = filters.map(t => t.replace(/(\W)/g, '\\$1')).join("|");
    const regex = new RegExp(reString);
    return regex.test(branchName);
}
