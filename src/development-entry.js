import React from 'react';
import ReactDOM from 'react-dom';
import 'src/demo/index.scss';
import App from 'src/demo/App';

import SlideToggle from "library/useSlideToggle";
const SlideToggle2 = require("library/useSlideToggle").default;

ReactDOM.render(<App SlideToggle={SlideToggle} SlideToggle2={SlideToggle2}/>, document.getElementById('root'));
