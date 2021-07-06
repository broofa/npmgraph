import checkCSS, { ignoreCSS, monitorCSS } from 'checkcss';
import React from 'react';
import { render } from 'react-dom';
import App from './App';
import './bugsnag'; // Initialize ASAP!
import { Flash } from './Components';

if (process.env.NODE_ENV == 'development') {
  ignoreCSS(/^(?:maintainer|license|module)-|graph|license/);
  checkCSS();
  monitorCSS();
}

// Used to feature-detect that es6 modules are loading
window.indexLoaded = true;

window.addEventListener('error', err => {
  console.error(err);
  Flash(err.message);
});

window.addEventListener('nhandledrejection', err => {
  console.error(err);
  Flash(err.reason);
});

window.onload = function() {
  render(<App />, document.querySelector('#app'));
};
