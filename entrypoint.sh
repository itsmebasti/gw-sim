#!/bin/bash

if [[ "${@}" = "" ]]; then
    tail -f /dev/null
    exit 0;
fi

exec ${@}
