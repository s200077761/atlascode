#!/bin/bash

NEWSTATE=`sqlite3 ~/Library/Application\ Support/Code/User/globalStorage/state.vscdb 'select value from ItemTable where key = "atlassian.atlascode";' | jq -c 'del(.atlascodeVersion)'`
sqlite3 ~/Library/Application\ Support/Code/User/globalStorage/state.vscdb "UPDATE ItemTable SET value = '$NEWSTATE' WHERE key = \"atlassian.atlascode\";"

