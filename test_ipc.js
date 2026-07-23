const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// stub app and session
const appStub = { getPath: () => '/tmp' };
const sessionStub = { defaultSession: { extensions: { loadExtension: async () => ({}) } }, fromPartition: () => ({ extensions: { loadExtension: async () => ({}) } }) };

const AdmZip = require('adm-zip');

console.log("fsp is defined in src/main/ipc.js on line 17!");
