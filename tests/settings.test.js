jest.mock('electron', () => ({
  app: {
    getPath: jest.fn().mockReturnValue('/mock/user/data')
  }
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

const fs = require('fs');
const { loadSettings, defaultSites } = require('../src/main/settings');
const state = require('../src/main/state');

describe('loadSettings', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('returns default settings when file does not exist', () => {
    fs.existsSync.mockReturnValue(false);

    const result = loadSettings();

    expect(result).toEqual({
      extensions: [],
      sites: defaultSites,
      adBlockEnabled: true,
      pinnedExtensions: [],
      volume: 1.0
    });
    expect(state.settings).toEqual(result);
    expect(state.appVolume).toBe(1.0);
  });

  test('loads and merges settings from file', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      extensions: ['ext1', 'ext2'],
      sites: [{ id: 'custom' }],
      adBlockEnabled: false,
      pinnedExtensions: ['ext1'],
      volume: 0.5
    }));

    const result = loadSettings();

    expect(result).toEqual({
      extensions: ['ext1', 'ext2'],
      sites: [{ id: 'custom' }],
      adBlockEnabled: false,
      pinnedExtensions: ['ext1'],
      volume: 0.5
    });
    expect(state.settings).toEqual(result);
    expect(state.appVolume).toBe(0.5);
  });

  test('loads partial settings and retains defaults for others', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      adBlockEnabled: false,
      volume: 0.8
    }));

    const result = loadSettings();

    expect(result).toEqual({
      extensions: [],
      sites: defaultSites,
      adBlockEnabled: false,
      pinnedExtensions: [],
      volume: 0.8
    });
    expect(state.settings).toEqual(result);
    expect(state.appVolume).toBe(0.8);
  });

  test('handles invalid JSON by returning default settings', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('invalid json');

    const result = loadSettings();

    expect(result).toEqual({
      extensions: [],
      sites: defaultSites,
      adBlockEnabled: true,
      pinnedExtensions: [],
      volume: 1.0
    });
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(state.settings).toEqual(result);
    expect(state.appVolume).toBe(1.0);
  });
});
