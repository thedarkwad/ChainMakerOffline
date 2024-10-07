import { MouseSensor as LibMouseSensor, TouchSensor as LibTouchSensor } from '@dnd-kit/core';
import { MouseEvent, TouchEvent } from 'react';

const handler = ({ nativeEvent: event }: MouseEvent | TouchEvent) => {
    let cur = event.target as HTMLElement;

    while (cur) {
        if (cur.classList.contains("icon-small") || cur.tagName=="INPUT" || cur.tagName=="TEXTAREA" || cur.classList.contains("user-whitespace")) {
            return false;
        }
        cur = cur.parentElement as HTMLElement;
    }

    return true;
};

export class MouseSensor extends LibMouseSensor {
    static activators = [{ eventName: 'onMouseDown', handler }] as typeof LibMouseSensor['activators'];
}

export class TouchSensor extends LibTouchSensor {
    static activators = [{ eventName: 'onTouchStart', handler }] as typeof LibTouchSensor['activators'];
}
