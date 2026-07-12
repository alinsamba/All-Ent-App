jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/mocked/userData'),
  },
}), { virtual: true });

jest.mock('fs');

const fs = require('fs');
const { loadSettings, defaultSites } = require('../src/main/settings');
const state = require('../src/main/state');

describe('loadSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should catch JSON parsing errors and use default settings', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue('{ malformed json }');

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const loaded = loadSettings();

    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('settings.json'));
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('settings.json'), 'utf8');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading settings',
      expect.any(SyntaxError)
    );

    expect(loaded).toEqual({
      extensions: [],
      sites: defaultSites,
      adBlockEnabled: true,
      pinnedExtensions: [],
      volume: 1.0,
    });

    expect(state.settings).toEqual(loaded);
    expect(state.appVolume).toBe(1.0);

    consoleErrorSpy.mockRestore();
  });
});
