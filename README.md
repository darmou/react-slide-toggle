## about

Origonal version here: https://github.com/kunukn/react-slide-toggle
Altered for React hooks by Daryl Moulder https://github.com/darmou/react-slide-toggle-hooks
React version of jQuery.slideToggle. JavaScript animation where height is set on every requestAnimationFrame.
The toggle direction can be reversed during the movement.

If you are looking for a CSS transition based alternative, then use this instead
https://github.com/kunukn/react-collapse

## Supported React versions

- React version 16.7+

## size

- UMD minified size ~7.8Kb (gzipped ~2.5Kb)

## setup / local demo

- git clone or download
- npm install
- npm start

## info

Default easing is cubicInOut. You can reverse the toggle before the movement completes. Ease in-out works best visually when reverse toggling is to be used.

This should be A11Y friendly, you can test the tabindex by tabbing. The collapsed items should be skipped due to usage of display:none (inert functionality)

JS animation is used for best animation control and possibility of adding interpolation or using advanged easing configuration which you can't with CSS alone. This triggers browser reflows on every requestAnimationFrame. If you have a very long page this might not be the best option to use.

## usage example

Look in App component for inspiration. Apply the styling as needed.

### component example, simple - render prop

```js
import useSliderToggle from "react-slide-toggle-hooks";
// or
// const useSliderToggle = require("react-slide-toggle");

// Apply optional padding to .my-collapsible__content-inner
const expandableRef = React.useRef();
const { toggle } = useSliderToggle({expandableRef});

return (
    <div className="my-collapsible">
      <button className="my-collapsible__toggle" onClick={toggle}>
        toggle
      </button>
      <div className="my-collapsible__content" ref={expandableRef}>
        <div className="my-collapsible__content-inner">Collapsible content</div>
      </div>
    </div>
);
```

### component example, simple - function as child

```js
import useSliderToggle from "react-slide-toggle-hooks";

// Apply optional padding to .my-collapsible__content-inner
const expandableRef = React.useRef();
const { toggle } = useSliderToggle({expandableRef});

return (
    <div className="my-collapsible">
      <button className="my-collapsible__toggle" onClick={toggle}>
        toggle
      </button>
      <div className="my-collapsible__content" ref={expandableRef}>
        <div className="my-collapsible__content-inner">Collapsible content</div>
      </div>
    </div>
);
```

### toggle state from outside example

```js
import useSliderToggle from "react-slide-toggle-hooks";

function MyComponent = () => {
  state = { toggleEvent: 0 };

  onToggle = () => {
    this.setState({ toggleEvent: Date.now() });
  };
  const expandableRef = React.useRef();

  useSliderToggle({expandableRef, toggleEvent: onToggle});

  return {
    return (
      <div>
        <button className="toggle" onClick={this.onToggle}>
          Toggle
        </button>
        <div className="my-collapsible">
          <div
            className="my-collapsible__content"
            ref={expandableRef}
          >
            <div className="my-collapsible__content-inner">
              Collapsible content
            </div>
          </div>
        </div>
      </div>
    );
  }
}
```

## local development

- git clone or download
- npm install
- npm run build
- The build files are now in the dist folder
