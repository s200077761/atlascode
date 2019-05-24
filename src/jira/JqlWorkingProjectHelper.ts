export const WorkingProjectToken = 'CURRENT_PROJECT';
export const WorkingProjectDisplayName = 'CURRENT_PROJECT';

export function applyWorkingProject(workingProjectId: string | undefined, jql: string): string | undefined {
    if (workingProjectId === undefined) {
        if (jqlReferencesWorkingProject(jql)) {
            return undefined;
        }
        return jql;
    }
    return jql.replace(WorkingProjectToken, workingProjectId);
}

export function jqlReferencesWorkingProject(jql: string): boolean {
    return jql.includes(WorkingProjectToken);
}
