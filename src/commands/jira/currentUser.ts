import { Container } from "../../container";


export async function currentUserJira() {
    let client = await Container.clientManager.jirarequest();

    if (client) {
        client.myself.getCurrentUser({}).then((user: JIRA.Response<JIRA.Schema.User>) => {
        });
    }
}
