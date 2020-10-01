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

export const useSlideToggle = ({interpolateOnReverse = false,
                                 onCollapsed = null, onUnmount = null,
                                 toggleEvent = null, expandEvent = null,
                                 collapseEvent = null, onMount = null,
                                 bestPerformance = true,
                                 whenReversedUseBackwardEase = null,
                                 noDisplayStyle = false, onExpanding = null,
                                 onCollapsing = null, onExpanded = null,
                                 noOverflowHidden = true,
                                 offsetHeight = false,
                                 irreversible = false, collapsed = false, duration = 300,
                                 easeCollapse = easeInOutCubic,
                                 easeExpand = easeInOutCubic}) => {

  // Internal state
  let _state_ = {
    collapsibleElement: null,
    toggleState: collapsed ? TOGGLE.COLLAPSED : TOGGLE.EXPANDED,
  };

  const [slideToggleState, setSlideToggleState] = React.useState({
    toggleState: _state_.toggleState,
    hasReversed: false,
    range: collapsed ? 0 : 1,
    progress: collapsed ? 0 : 1,
  });

  const didMountRef = React.useRef(false);
  const prevCollapseEvent = React.useRef();
  const prevExpandEvent = React.useRef();
  const prevToggleEvent = React.useRef();

  React.useEffect(() => {
    prevCollapseEvent.current = collapseEvent;
    prevExpandEvent.current = expandEvent;
    prevToggleEvent.current = toggleEvent;

    // code to run on component mount
    onMount &&
    onMount({
      toggleState: slideToggleState.toggleState,
      toggle: slideToggleState.toggle,
    });
    if (didMountRef.current) {
      if (
          collapseEvent &&
          collapseEvent > prevExpandEvent.current
      ) {
        if (
            _state_.toggleState === TOGGLE.EXPANDED ||
            _state_.toggleState === TOGGLE.EXPANDING
        ) {
          toggle();
        }
      }
      if (
          expandEvent &&
          expandEvent > prevExpandEvent.current
      ) {
        if (
            _state_.toggleState === TOGGLE.COLLAPSED ||
            _state_.toggleState === TOGGLE.COLLAPSING
        ) {
          toggle();
        }
      }
      if (
          toggleEvent &&
          toggleEvent > prevToggleEvent.current
      ) {
        toggle();
      }
    } else didMountRef.current = true

    return function cleanup() {
      onUnmount &&
      onUnmount({
        toggleState: slideToggleState.toggleState,
      });
      _state_.timeout && cAF(_state_.timeout);
    }

  }, [slideToggleState, onMount, didMountRef, expandEvent, collapseEvent, toggleEvent]);


  const GET_HEIGHT = offsetHeight ? 'offsetHeight' : 'scrollHeight';

  const getCollapsible = () => _state_.collapsibleElement;

  const updateCollapsible = (attr, value) => {
    if (getCollapsible()) {
      _state_.collapsibleElement.style[attr] = value;
    }
  };

  const setCollapsibleElement = element => {
    _state_.collapsibleElement = element;
    if (_state_.collapsibleElement && !noOverflowHidden) {
      _state_.collapsibleElement.style.overflow = 'hidden';
    }
    if (_state_.toggleState === TOGGLE.COLLAPSED) {
      setCollapsedState({ initialState: true });
    }
  };

  const toggle = () => {
    if (irreversible && util.isMoving(_state_.toggleState)) {
      return;
    }

    const invokeCollapsing = () => {
      onCollapsing &&
      onCollapsing({
        range: slideToggleState.range,
        progress: slideToggleState.progress,
        hasReversed: slideToggleState.hasReversed,
      });

      collapse();
    };
    const invokeExpanding = () => {
      onExpanding &&
      onExpanding({
        range: slideToggleState.range,
        progress: slideToggleState.progress,
        hasReversed: slideToggleState.hasReversed,
      });

      expand();
    };

    const updateInternalState = ({ toggleState, display, hasReversed }) => {
      _state_.toggleState = toggleState;
      _state_.hasReversed = !!hasReversed;

      if (display !== undefined && !noDisplayStyle) {
        updateCollapsible('display', display);
      }

      const now = util.now();

      if (hasReversed) {
        const { startTime } = _state_;
        const duration = util.sanitizeDuration(duration);
        const elapsedTime = Math.min(duration, now - startTime);
        const subtract = Math.max(0, duration - elapsedTime);
        _state_.startTime = now - subtract;
      } else {
        const collapsible = getCollapsible();
        if (collapsible && collapsible.style.height) {
          updateCollapsible('height', null);
        }
        _state_.boxHeight = collapsible ? collapsible[GET_HEIGHT] : 0;
        _state_.startTime = now;
        _state_.startDirection = toggleState;
      }

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
  };

  const setExpandedState = () => {
    _state_.progress = 1;
    _state_.toggleState = TOGGLE.EXPANDED;
    updateCollapsible('height', null);

    setSlideToggleState({...slideToggleState, toggleState: TOGGLE.EXPANDED, range: 1, progress: _state_.progress});
    if (onExpanded) {
      onExpanded({
        hasReversed: slideToggleState.hasReversed,
      });
    }
  };

  const expand = () => {
    if (_state_.toggleState !== TOGGLE.EXPANDING) {
      return;
    }

    const duration = util.sanitizeDuration(duration);
    if (duration <= 0) {
      setExpandedState();
      return;
    }

    const { startTime } = _state_;
    const elapsedTime = Math.min(duration, util.now() - startTime);

    if (elapsedTime >= duration) {
      setExpandedState();
    } else {
      const { startDirection, toggleState, boxHeight } = _state_;
      const range = util.clamp({ value: elapsedTime / duration });

      let progress;
      if (
          whenReversedUseBackwardEase &&
          startDirection !== toggleState
      ) {
        progress = 1 - easeCollapse(1 - range);
      } else {
        progress = easeExpand(range);
      }

      if (!bestPerformance) {
        setSlideToggleState({...slideToggleState, range, progress});
      }

      if (interpolateOnReverse && _state_.hasReversed) {
        progress = util.interpolate({
          next: progress,
          prev: _state_.progress,
        });
      }

      const currentHeightValue = Math.round(boxHeight * progress);
      _state_.progress = progress;
      updateCollapsible('height', `${currentHeightValue}px`);
      nextTick(expand);
    }
  };

  const setCollapsedState = ({ initialState } = {}) => {
    _state_.progress = 0;
    _state_.toggleState = TOGGLE.COLLAPSED;

    if (!noDisplayStyle) {
      updateCollapsible('display', 'none');
      updateCollapsible('height', null);
    } else {
      updateCollapsible('height', '0px');
    }

    setSlideToggleState({...slideToggleState, toggleState: TOGGLE.COLLAPSED, range: 0, progress: _state_.progress});

    if (!initialState && onCollapsed)
      onCollapsed({
        hasReversed: slideToggleState.hasReversed,
      });
  };

  const collapse = () => {
    if (_state_.toggleState !== TOGGLE.COLLAPSING) {
      return;
    }
    const duration = util.sanitizeDuration(duration);
    if (duration <= 0) {
      setCollapsedState();
      return;
    }

    const { startTime } = _state_;
    const elapsedTime = Math.min(duration, util.now() - startTime);

    if (elapsedTime >= duration) {
      setCollapsedState();
    } else {
      const { startDirection, boxHeight, toggleState } = _state_;
      const range = 1 - util.clamp({ value: elapsedTime / duration });

      let progress;
      if (whenReversedUseBackwardEase && startDirection !== toggleState) {
        progress = easeExpand(range);
      } else {
        progress = 1 - easeCollapse(1 - range);
      }

      if (!bestPerformance) {
        setSlideToggleState({...slideToggleState, range, progress });
      }

      if (interpolateOnReverse && _state_.hasReversed) {
        progress = util.interpolate({
          next: progress,
          prev: _state_.progress,
        });
      }

      const currentHeightValue = Math.round(boxHeight * progress);
      _state_.progress = progress;
      _state_.timeout = nextTick(collapse);
      updateCollapsible('height', `${currentHeightValue}px`);
    }
  };

  const nextTick = callback => {
    _state_.timeout = rAF(callback);
  };

  return { toggle, setCollapsibleElement, toggleEvent, slideToggleState }
}



// SlideToggle.propTypes = {
//   render: PropTypes.func,
//     children: PropTypes.func,
//     duration: PropTypes.number,
//     irreversible: PropTypes.bool,
//     whenReversedUseBackwardEase: PropTypes.bool,
//     noDisplayStyle: PropTypes.bool,
//     noOverflowHidden: PropTypes.bool,
//     bestPerformance: PropTypes.bool,
//     interpolateOnReverse: PropTypes.bool,
//     easeCollapse: PropTypes.func,
//     easeExpand: PropTypes.func,
//     collapsed: PropTypes.bool,
//     onExpanded: PropTypes.func,
//     onExpanding: PropTypes.func,
//     onCollapsed: PropTypes.func,
//     onCollapsing: PropTypes.func,
//     scrollHeight: PropTypes.bool,
// }
