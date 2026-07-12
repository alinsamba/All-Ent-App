const fs = require('fs');
const path = require('path');
const state = require('./state');

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mocked/user/data/path')
  }
}));

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}));

// Mock console.error to keep test output clean
console.error = jest.fn();

const { loadSettings, saveSettings, defaultSites } = require('./settings');

describe('settings.js', () => {
  const expectedSettingsPath = path.join('/mocked/user/data/path', 'settings.json');

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset state before each test
    state.settings = null;
    state.appVolume = 1.0;
  });

  describe('loadSettings', () => {
    it('should return default settings if settings file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const settings = loadSettings();

      expect(fs.existsSync).toHaveBeenCalledWith(expectedSettingsPath);
      expect(fs.readFileSync).not.toHaveBeenCalled();

      const expectedDefaults = {
        extensions: [],
        sites: defaultSites,
        adBlockEnabled: true,
        pinnedExtensions: [],
        volume: 1.0
      };

      expect(settings).toEqual(expectedDefaults);
      expect(state.settings).toEqual(expectedDefaults);
      expect(state.appVolume).toBe(1.0);
    });

    it('should merge defaults and file contents if file exists but has missing properties', () => {
      fs.existsSync.mockReturnValue(true);
      const partialSettings = {
        volume: 0.5,
        adBlockEnabled: false
      };
      fs.readFileSync.mockReturnValue(JSON.stringify(partialSettings));

      const settings = loadSettings();

      expect(fs.existsSync).toHaveBeenCalledWith(expectedSettingsPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(expectedSettingsPath, 'utf8');

      const expectedMerged = {
        extensions: [],
        sites: defaultSites,
        adBlockEnabled: false,
        pinnedExtensions: [],
        volume: 0.5
      };

      expect(settings).toEqual(expectedMerged);
      expect(state.settings).toEqual(expectedMerged);
      expect(state.appVolume).toBe(0.5);
    });

    it('should catch invalid JSON error and return defaults without crashing', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('{ invalid json ');

      const settings = loadSettings();

      expect(console.error).toHaveBeenCalled();

      const expectedDefaults = {
        extensions: [],
        sites: defaultSites,
        adBlockEnabled: true,
        pinnedExtensions: [],
        volume: 1.0
      };

      expect(settings).toEqual(expectedDefaults);
      expect(state.settings).toEqual(expectedDefaults);
      expect(state.appVolume).toBe(1.0);
    });

    it('should load full custom settings if file contains them', () => {
      fs.existsSync.mockReturnValue(true);
      const fullCustomSettings = {
        extensions: ['ext1', 'ext2'],
        sites: [{ id: 'custom', url: 'https://example.com', name: 'Custom' }],
        adBlockEnabled: false,
        pinnedExtensions: ['ext1'],
        volume: 0.8
      };
      fs.readFileSync.mockReturnValue(JSON.stringify(fullCustomSettings));

      const settings = loadSettings();

      expect(settings).toEqual(fullCustomSettings);
      expect(state.settings).toEqual(fullCustomSettings);
      expect(state.appVolume).toBe(0.8);
    });
  });

  describe('saveSettings', () => {
    it('should save provided settings to the fs and update the state', () => {
      const settingsToSave = {
        extensions: ['ext1'],
        sites: [],
        adBlockEnabled: true,
        pinnedExtensions: [],
        volume: 0.7
      };

      saveSettings(settingsToSave);

      expect(state.settings).toEqual(settingsToSave);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expectedSettingsPath,
        JSON.stringify(settingsToSave, null, 2)
      );
    });
  });
});
