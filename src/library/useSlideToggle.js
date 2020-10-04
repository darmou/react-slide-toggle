/*
  _state_ is internal state for sync and rendering control.
  setState is async and I need sync control because timing is important
  and because I need to control what is to be re-rendered.
*/

import React from 'react';
//import PropTypes from 'prop-types';

// Support browser or node env
const root = typeof window !== 'undefined' ? window : global;
const rAF = root.requestAnimationFrame
    ? root.requestAnimationFrame.bind(root)
    : callback => root.setTimeout(callback, 16);
const cAF = root.cancelAnimationFrame
    ? root.cancelAnimationFrame.bind(root)
    : root.clearInterval.bind(root);

const TOGGLE = Object.freeze({
  EXPANDED: 'EXPANDED',
  COLLAPSED: 'COLLAPSED',
  EXPANDING: 'EXPANDING',
  COLLAPSING: 'COLLAPSING',
});

const easeInOutCubic = t =>
    t < 0.5 ? 4 * t * t * t : 0.5 * Math.pow(2 * t - 2, 3) + 1;

const util = {
  isMoving: toggleState =>
      toggleState === TOGGLE.EXPANDING || toggleState === TOGGLE.COLLAPSING,
  clamp: ({ value, max = 1, min = 0 }) => {
    if (value > max) return max;
    if (value < min) return min;
    return value;
  },
  now: () => Date.now(),
  sanitizeDuration: duration => Math.max(0, parseInt(+duration, 10) || 0),
  interpolate: ({ next, prev }) => {
    /*
      If the diff in the next rAF is big, it can seem jumpy when reversing the toggling
      This is heuristic approach to minimize the diff value by interpolating.
    */
    const diff = Math.abs(next - prev);
    let interpolated = next;
    if (diff > 0.15) {
      /* heuristic value */
      if (next > prev) interpolated -= diff * 0.75;
      /* heuristic value */ else
        interpolated += diff * 0.75; /* heuristic value */
    }
    return interpolated;
  },
};

function usePrevious(value) {
  const ref = React.useRef();
  React.useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}


import { useCallback, useState } from 'react';

const useSlideToggle = ({duration = 300, initialState = TOGGLE.EXPANDED,
                          collapsed = false,
                          toggleEvent = undefined,
                          easeCollapse = easeInOutCubic,
                          easeExpand = easeInOutCubic }) => {

  const expandableRef = React.useRef();
  const [slideToggleState, setSlideToggleState] = useState({
    toggleState: initialState,
    hasReversed: false,
    range: collapsed ? 0 : 1,
    progress: collapsed ? 0 : 1,
    expandableRef: expandableRef
  });




  // Internal state
  let _state_ = {
    collapsibleElement: (expandableRef != null) ? expandableRef.current : slideToggleState.expandableRef?.current,
    toggleState: slideToggleState.toggleState
  };

  const toggle = useCallback(() => {

    if (expandableRef != null && slideToggleState.expandableRef == null) {
      setSlideToggleState({...slideToggleState, expandableRef: expandableRef});
    }
    const invokeCollapsing = () => {
      collapse(duration);
    };

    const invokeExpanding = () => {
      expand(duration);
    };

    const updateInternalState = ({ toggleState, display, hasReversed }) => {
      _state_.toggleState = toggleState;
      _state_.hasReversed = !!hasReversed;

      if (display !== undefined) {
        updateCollapsible('display', display);
      }

      const now = util.now();

      const collapsible = getCollapsible();
      if (collapsible && collapsible.style.height) {
        updateCollapsible('height', null);
      }
      _state_.boxHeight = collapsible ? collapsible[GET_HEIGHT] : 0;
      _state_.startTime = now;
      _state_.startDirection = toggleState;


      setSlideToggleState({...slideToggleState,
        toggleState: _state_.toggleState, hasReversed: _state_.hasReversed
      });
    };

    switch (_state_.toggleState) {
      case TOGGLE.EXPANDED:
        updateInternalState({ toggleState: TOGGLE.COLLAPSING });
        invokeCollapsing();
        break;
      case TOGGLE.COLLAPSED:
        updateInternalState({
          toggleState: TOGGLE.EXPANDING,
          display: '',
        });
        invokeExpanding();
        break;
      case TOGGLE.EXPANDING:
        updateInternalState({
          toggleState: TOGGLE.COLLAPSING,
          hasReversed: true,
        });
        invokeCollapsing();
        break;
      case TOGGLE.COLLAPSING:
        updateInternalState({
          toggleState: TOGGLE.EXPANDING,
          display: '',
          hasReversed: true,
        });
        invokeExpanding();
        break;
    }

  }, []);

  const prevEvent = usePrevious({toggleEvent});
  React.useEffect(() => {
    if (toggleEvent
        && toggleEvent > prevEvent.toggleEvent) {
      toggle();
    }
  }, [toggleEvent]);

  const getCollapsible = () => {
    return  (slideToggleState.expandableRef != null) ? slideToggleState.expandableRef.current : _state_.collapsibleElement;
  };

  const setCollapsedState = () => {
    _state_.progress = 0;
    _state_.toggleState = TOGGLE.COLLAPSED;

    updateCollapsible('display', 'none');
    updateCollapsible('height', null);

    if (slideToggleState.toggleState !== TOGGLE.COLLAPSED) {
      setSlideToggleState({...slideToggleState, toggleState: TOGGLE.COLLAPSED, range: 0, progress: _state_.progress});
    }

  };

  const nextTick = callback => {
    _state_.timeout = rAF(callback);
  };

  const GET_HEIGHT = 'scrollHeight';

  const updateCollapsible = (attr, value) => {
    _state_.collapsibleElement = getCollapsible();
    if (_state_.collapsibleElement) {
      if (_state_.collapsibleElement.style.overflow !== 'hidden') {
        _state_.collapsibleElement.style['overflow'] = 'hidden';
      }
      _state_.collapsibleElement.style[attr] = value;
    }
  };

  const setExpandedState = () => {
    _state_.progress = 1;
    _state_.toggleState = TOGGLE.EXPANDED;
    updateCollapsible('height', null);

    if (slideToggleState.toggleState !== TOGGLE.EXPANDED) {
      setSlideToggleState({...slideToggleState, toggleState: TOGGLE.EXPANDED, range: 1, progress: _state_.progress});
    }
  };

  const expand = (dur) => {
    if (_state_.toggleState !== TOGGLE.EXPANDING) {
      return;
    }

    const duration = util.sanitizeDuration(dur);
    if (duration <= 0) {
      setExpandedState();
      return;
    }

    const { startTime } = _state_;
    const elapsedTime = util.now() - startTime;

    if (elapsedTime >= duration) {
      setExpandedState();
    } else {
      const { startDirection, toggleState, boxHeight } = _state_;
      const range = util.clamp({ value: elapsedTime / duration });

      let progress;
      if (
          startDirection !== toggleState
      ) {
        progress = 1 - easeCollapse(1 - range);
      } else {
        progress = easeExpand(range);
      }


      if (_state_.hasReversed) {
        progress = util.interpolate({
          next: progress,
          prev: _state_.progress,
        });
      }

      const currentHeightValue = Math.round(boxHeight * progress);
      _state_.progress = progress;
      updateCollapsible('height', `${currentHeightValue}px`);
      nextTick(() => expand(duration));
    }
  };

  const collapse = (dur) => {
    if (_state_.toggleState !== TOGGLE.COLLAPSING) {
      return;
    }
    const duration = util.sanitizeDuration(dur);
    if (duration <= 0) {
      setCollapsedState();
      return;
    }

    const { startTime } = _state_;
    const elapsedTime = util.now() - startTime;

    if (elapsedTime >= duration) {
      setCollapsedState();
    } else {
      const { startDirection, boxHeight, toggleState } = _state_;
      const range = 1 - util.clamp({ value: elapsedTime / duration });

      let progress;
      if (startDirection !== toggleState) {
        progress = easeExpand(range);
      } else {
        progress = 1 - easeCollapse(1 - range);
      }

      const currentHeightValue = Math.round(boxHeight * progress);
      _state_.progress = progress;
      _state_.timeout = nextTick(() => collapse(duration));
      updateCollapsible('height', `${currentHeightValue}px`);
    }
  };

  return { expandableRef, slideToggleState, toggle };
};

export default useSlideToggle;