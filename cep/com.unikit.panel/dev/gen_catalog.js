// node cep/com.unikit.panel/dev/gen_catalog.js — генерирует dev/catalog.json из dist/UniKit.jsx через мок AE
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', '..', '..');
const M = require(path.join(root, 'test', 'mock_ae.js'));
const code = fs.readFileSync(path.join(root, 'dist', 'UniKit.jsx'), 'utf8').replace(/^﻿/, '');
const ctx = Object.assign({ console }, M);
vm.createContext(ctx);
ctx.$ = Object.assign({}, M.$, { global: ctx });
ctx.UK_HEADLESS = true;
vm.runInContext(code, ctx, { filename: 'UniKit.jsx' });
const UK = ctx.UK;
const json = UK.catalogJSON();
JSON.parse(json);
fs.writeFileSync(path.join(__dirname, 'catalog.json'), json, 'utf8');
console.log('dev/catalog.json:', JSON.parse(json).presets.length, 'presets');
