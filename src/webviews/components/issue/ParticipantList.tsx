import * as React from "react";

type Props = {
    users: string[];
};

type State = {};

export class ParticipantList extends React.Component<Props, State> {
    constructor(props: any) {
        super(props);
    }


    userList(): any[] {

        let result: any[] = [];
        this.props.users.forEach((user: string) => {
            result.push(<div>{user}</div>);
        });

        return result;
    }

    render() {
        return (
            <React.Fragment>
                {this.userList()}
            </React.Fragment>
        );
    }
}
